import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import Group from "@/models/Group";
import User from "@/models/User";

const ACTIVE_SCHOOL_STATUSES = ["APPROVED", "SUBSCRIBED"];
const OPEN_INVITATION_STATUSES = ["PENDING", "APPROVED", "DISAPPROVED"];

export function isPublishablePlatformEvent(event) {
  if (!event) return false;
  return (
    event.eventScope === "PLATFORM" &&
    event.status === "APPROVED" &&
    event.lifecycleStatus === "ACTIVE" &&
    event.visibility !== "PRIVATE"
  );
}

async function getTargetSchoolIds(event) {
  if (!isPublishablePlatformEvent(event)) return [];

  if (event.targetGroup) {
    const group = await Group.findById(event.targetGroup).select("schools").lean();
    const schoolIds = Array.isArray(group?.schools) ? group.schools : [];

    if (schoolIds.length === 0) return [];

    const schools = await User.find({
      _id: { $in: schoolIds },
      role: "SCHOOL_ADMIN",
      status: { $in: ACTIVE_SCHOOL_STATUSES },
    })
      .select("_id")
      .lean();

    return schools.map((school) => school._id);
  }

  const schools = await User.find({
    role: "SCHOOL_ADMIN",
    status: { $in: ACTIVE_SCHOOL_STATUSES },
  })
    .select("_id")
    .lean();

  return schools.map((school) => school._id);
}

export async function syncEventSchoolInvitations(eventOrId, options = {}) {
  const event =
    typeof eventOrId === "object" && eventOrId?._id
      ? eventOrId
      : await Event.findById(eventOrId);

  if (!event) {
    return { invitedSchools: 0, withdrawnSchools: 0 };
  }

  if (!isPublishablePlatformEvent(event)) {
    const withdrawn = await EventSchoolInvitation.updateMany(
      {
        event: event._id,
        status: { $in: OPEN_INVITATION_STATUSES },
      },
      {
        $set: {
          status: "WITHDRAWN",
          reason: "Event is no longer published for school invitations.",
        },
      }
    );

    return {
      invitedSchools: 0,
      withdrawnSchools: withdrawn.modifiedCount || 0,
    };
  }

  const schoolIds = await getTargetSchoolIds(event);
  const now = new Date();

  if (schoolIds.length === 0) {
    return { invitedSchools: 0, withdrawnSchools: 0 };
  }

  await EventSchoolInvitation.bulkWrite(
    schoolIds.map((schoolId) => ({
      updateOne: {
        filter: { event: event._id, school: schoolId },
        update: {
          $setOnInsert: {
            event: event._id,
            school: schoolId,
            status: "PENDING",
            notifiedAt: now,
            createdBy: options.createdBy || event.createdBy || null,
          },
          $set: {
            targetGroup: event.targetGroup || null,
            eventTitleSnapshot: event.title || "",
          },
        },
        upsert: true,
      },
    }))
  );

  const withdrawn = await EventSchoolInvitation.updateMany(
    {
      event: event._id,
      school: { $nin: schoolIds },
      status: { $in: ["PENDING", "APPROVED"] },
    },
    {
      $set: {
        status: "WITHDRAWN",
        reason: "School is no longer in the target audience for this event.",
      },
    }
  );

  return {
    invitedSchools: schoolIds.length,
    withdrawnSchools: withdrawn.modifiedCount || 0,
  };
}

export async function ensureSchoolInvitationsForPublishedEvents(schoolId) {
  if (!schoolId) return { ensured: 0 };

  const groups = await Group.find({ schools: schoolId }).select("_id").lean();
  const groupIds = groups.map((group) => group._id);
  const events = await Event.find({
    eventScope: "PLATFORM",
    status: "APPROVED",
    lifecycleStatus: "ACTIVE",
    visibility: { $ne: "PRIVATE" },
    $or: [{ targetGroup: null }, { targetGroup: { $in: groupIds } }],
  })
    .select("_id title targetGroup createdBy")
    .lean();

  if (events.length === 0) return { ensured: 0 };

  const now = new Date();

  await EventSchoolInvitation.bulkWrite(
    events.map((event) => ({
      updateOne: {
        filter: { event: event._id, school: schoolId },
        update: {
          $setOnInsert: {
            event: event._id,
            school: schoolId,
            status: "PENDING",
            notifiedAt: now,
            createdBy: event.createdBy || null,
          },
          $set: {
            targetGroup: event.targetGroup || null,
            eventTitleSnapshot: event.title || "",
          },
        },
        upsert: true,
      },
    }))
  );

  return { ensured: events.length };
}

export async function ensureSchoolInvitationForEvent(eventId, schoolId) {
  if (!eventId || !schoolId) return null;

  await ensureSchoolInvitationsForPublishedEvents(schoolId);

  return EventSchoolInvitation.findOne({
    event: eventId,
    school: schoolId,
    status: { $ne: "WITHDRAWN" },
  });
}
