/**
 * Translation layer for the Parent App (§23).
 *
 * The project had no i18n architecture when this was written, so this is a
 * deliberately small one rather than a framework dependency: a flat key/value
 * dictionary per locale, resolved through `t()`. Flat keys (not nested objects)
 * keep lookups O(1) and make a missing translation obvious in review.
 *
 * Behaviour on a missing key is to fall back to English and then to the key
 * itself — a half-translated screen must still be usable, never blank.
 *
 * Nepali strings are the primary reason this exists: the app targets guardians
 * with mixed literacy, and reading school communication in a second language is
 * exactly the barrier the Parent App is meant to remove. Where a Nepali string
 * is not yet supplied the English is shown, which is why `ne` below is allowed
 * to be incomplete without breaking anything.
 */

export const SUPPORTED_LOCALES = ["en", "ne"];
export const DEFAULT_LOCALE = "en";

export const LOCALE_LABELS = {
  en: "English",
  ne: "नेपाली",
};

const en = {
  // --- Navigation -------------------------------------------------------
  "nav.home": "Home",
  "nav.journey": "Journey",
  "nav.events": "Events",
  "nav.messages": "Messages",
  "nav.child": "My Child",

  // --- Status system (§4) ----------------------------------------------
  "status.actionRequired": "ACTION REQUIRED",
  "status.needsAttention": "NEEDS ATTENTION",
  "status.complete": "COMPLETE",
  "status.info": "INFORMATION",
  "status.newAchievement": "NEW ACHIEVEMENT",
  "status.live": "LIVE",

  // --- Learning stages --------------------------------------------------
  "learning.developing": "Developing",
  "learning.progressing": "Progressing",
  "learning.strong": "Strong",
  "learning.achievement": "Achievement",

  // --- Home -------------------------------------------------------------
  "home.greeting": "Today",
  "home.viewFullJourney": "View Full Journey",
  "home.journeyTitle": "{name}'s Journey",
  "home.registerNow": "Register Now",
  "home.open": "Open",
  "home.read": "Read",
  "home.listen": "Listen",
  "home.viewEvent": "View Event",
  "home.openConversation": "Open Conversation",
  "home.see": "See",
  "home.allCaughtUp": "You're all caught up.",
  "home.newWriting": "NEW WRITING",
  "home.newMessage": "Message from school",
  "home.publishedBy": "{name} published:",
  "home.participating": "{name} is currently participating.",

  // --- Child switcher ---------------------------------------------------
  "child.switch": "Switch child",
  "child.selectChild": "Select a child",
  "child.grade": "Grade {grade}",

  // --- Journey ----------------------------------------------------------
  "journey.title": "{name}'s Journey",
  "journey.all": "All",
  "journey.achievements": "Achievements",
  "journey.writing": "Writing",
  "journey.research": "Research",
  "journey.events": "Events",
  "journey.certificates": "Certificates",
  "journey.groupByYear": "Year",
  "journey.groupByGrade": "Grade",
  "journey.groupBySchool": "School",
  "journey.joined": "Joined {school}",
  "journey.transferred": "Moved to {school}",
  "journey.graduated": "Graduated from {school}",
  "journey.empty":
    "{name}'s achievements will appear here as their journey grows.",

  // --- Notices ----------------------------------------------------------
  "notices.title": "Notices",
  "notices.actionRequired": "Action Required",
  "notices.unread": "Unread",
  "notices.read": "Read",
  "notices.iUnderstand": "I Understand",
  "notices.acknowledged": "You confirmed on {date}",
  "notices.consentQuestion": "Allow {name} to participate?",
  "notices.yes": "YES",
  "notices.no": "NO",
  "notices.consentRecorded": "You answered {answer} on {date}",
  "notices.deadline": "Closes {date}",
  "notices.empty": "✓ Everything is up to date.",
  "notices.otherGuardians": "Other guardians",
  "notices.notReadYet": "Not read",

  // --- Events -----------------------------------------------------------
  "events.title": "Events",
  "events.liveNow": "LIVE NOW",
  "events.openForRegistration": "Open for registration",
  "events.registered": "Registered",
  "events.completed": "Completed",
  "events.registerChild": "Register {name}",
  "events.registrationCloses": "Registration closes: {date}",
  "events.venue": "Venue",
  "events.role": "Role",
  "events.alreadyRegistered": "{name} is registered",
  "events.awaitingApproval": "Waiting for school approval",
  "events.empty": "No upcoming events.",
  "events.viewCertificate": "View Certificate",

  // --- Messages ---------------------------------------------------------
  "messages.title": "Messages",
  "messages.newConversation": "New message",
  "messages.whatDoYouNeed": "What do you need help with?",
  "messages.topicLearning": "Learning",
  "messages.topicEvents": "Events",
  "messages.topicTransport": "Transport",
  "messages.topicFees": "Fees / Accounts",
  "messages.topicAdministration": "Administration",
  "messages.topicWellbeing": "Student Wellbeing",
  "messages.topicOther": "Other",
  "messages.typeMessage": "Type a message",
  "messages.holdToSpeak": "Hold to speak",
  "messages.recording": "Recording…",
  "messages.send": "Send",
  "messages.empty": "No messages yet. Start a conversation with the school.",
  "messages.voiceMessage": "Voice message",
  "messages.photo": "Photo",
  "messages.document": "Document",

  // --- My Child ---------------------------------------------------------
  "child.profile": "Profile",
  "child.journey": "Journey",
  "child.achievements": "Achievements",
  "child.writing": "Writing & Research",
  "child.certificates": "Certificates",
  "child.events": "Events",
  "child.participation": "Participation",
  "child.schoolsAttended": "Schools Attended",
  "child.verified": "Verified",
  "child.certificateId": "Certificate ID",
  "child.viewCertificate": "View Certificate",
  "child.verifyCertificate": "Verify Certificate",
  "child.teacherReviewed": "Teacher reviewed",
  "child.noAchievements":
    "{name}'s achievements will appear here as their journey grows.",
  "child.noWriting": "{name}'s published writing will appear here.",
  "child.noCertificates": "Certificates will appear here once issued.",

  // --- Writing categories ----------------------------------------------
  "writing.articles": "Articles",
  "writing.research": "Research",
  "writing.creative": "Creative Writing",
  "writing.poems": "Poems",
  "writing.blogs": "Blogs",
  "writing.speeches": "Speeches",

  // --- Settings / accessibility ----------------------------------------
  "settings.title": "Settings",
  "settings.simpleMode": "Simple Parent Mode",
  "settings.simpleModeHelp": "Bigger text, fewer cards, one button per card.",
  "settings.language": "Language",
  "settings.dataSaver": "Data saver",
  "settings.dataSaverHelp": "Load smaller images. Best on slow connections.",
  "settings.notifications": "Notifications",
  "settings.signOut": "Sign out",
  "settings.listen": "Listen",
  "settings.stopListening": "Stop",

  // --- Linking (§26) ----------------------------------------------------
  "link.title": "Connect to Your Child",
  "link.description":
    "Your school will give you an invitation code. Enter it here to see your child.",
  "link.codeLabel": "Invitation code",
  "link.submit": "Connect",
  "link.contactSchool": "Contact your school",
  "link.invalid": "That code is not valid. Please check with your school.",
  "link.success": "Connected to {name}",

  // --- Generic ----------------------------------------------------------
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.back": "Back",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.today": "Today",
  "common.yesterday": "Yesterday",
  "common.school": "School",
  "common.somethingWrong": "Something went wrong. Please try again.",
};

const ne = {
  "nav.home": "गृह",
  "nav.journey": "यात्रा",
  "nav.events": "कार्यक्रम",
  "nav.messages": "सन्देश",
  "nav.child": "मेरो बच्चा",

  "status.actionRequired": "काम गर्नुपर्ने",
  "status.needsAttention": "ध्यान दिनुहोस्",
  "status.complete": "सम्पन्न",
  "status.info": "जानकारी",
  "status.newAchievement": "नयाँ उपलब्धि",
  "status.live": "प्रत्यक्ष",

  "learning.developing": "विकास हुँदै",
  "learning.progressing": "प्रगति गर्दै",
  "learning.strong": "बलियो",
  "learning.achievement": "उपलब्धि",

  "home.greeting": "आज",
  "home.viewFullJourney": "पूरा यात्रा हेर्नुहोस्",
  "home.journeyTitle": "{name} को यात्रा",
  "home.registerNow": "अहिले दर्ता गर्नुहोस्",
  "home.open": "खोल्नुहोस्",
  "home.read": "पढ्नुहोस्",
  "home.listen": "सुन्नुहोस्",
  "home.viewEvent": "कार्यक्रम हेर्नुहोस्",
  "home.openConversation": "कुराकानी खोल्नुहोस्",
  "home.see": "हेर्नुहोस्",
  "home.allCaughtUp": "सबै अद्यावधिक छ।",
  "home.newWriting": "नयाँ लेख",
  "home.newMessage": "विद्यालयबाट सन्देश",
  "home.publishedBy": "{name} ले प्रकाशित गर्नुभयो:",
  "home.participating": "{name} अहिले सहभागी हुँदैहुनुहुन्छ।",

  "child.switch": "बच्चा फेर्नुहोस्",
  "child.selectChild": "बच्चा छान्नुहोस्",
  "child.grade": "कक्षा {grade}",

  "journey.title": "{name} को यात्रा",
  "journey.all": "सबै",
  "journey.achievements": "उपलब्धिहरू",
  "journey.writing": "लेखन",
  "journey.research": "अनुसन्धान",
  "journey.events": "कार्यक्रम",
  "journey.certificates": "प्रमाणपत्र",
  "journey.groupByYear": "वर्ष",
  "journey.groupByGrade": "कक्षा",
  "journey.groupBySchool": "विद्यालय",
  "journey.joined": "{school} मा भर्ना",
  "journey.transferred": "{school} मा सरुवा",
  "journey.graduated": "{school} बाट उत्तीर्ण",
  "journey.empty": "{name} का उपलब्धिहरू यहाँ देखिनेछन्।",

  "notices.title": "सूचनाहरू",
  "notices.actionRequired": "काम गर्नुपर्ने",
  "notices.unread": "नपढिएको",
  "notices.read": "पढिएको",
  "notices.iUnderstand": "मैले बुझें",
  "notices.acknowledged": "{date} मा पुष्टि गर्नुभयो",
  "notices.consentQuestion": "{name} लाई सहभागी हुन अनुमति दिने?",
  "notices.yes": "हुन्छ",
  "notices.no": "हुँदैन",
  "notices.consentRecorded": "{date} मा {answer} जवाफ दिनुभयो",
  "notices.deadline": "{date} मा बन्द हुन्छ",
  "notices.empty": "✓ सबै अद्यावधिक छ।",
  "notices.otherGuardians": "अन्य अभिभावक",
  "notices.notReadYet": "पढिएको छैन",

  "events.title": "कार्यक्रम",
  "events.liveNow": "अहिले प्रत्यक्ष",
  "events.openForRegistration": "दर्ता खुला",
  "events.registered": "दर्ता भएको",
  "events.completed": "सम्पन्न",
  "events.registerChild": "{name} लाई दर्ता गर्नुहोस्",
  "events.registrationCloses": "दर्ता बन्द: {date}",
  "events.venue": "स्थान",
  "events.role": "भूमिका",
  "events.alreadyRegistered": "{name} दर्ता हुनुभएको छ",
  "events.awaitingApproval": "विद्यालयको स्वीकृति पर्खिँदै",
  "events.empty": "आगामी कार्यक्रम छैन।",
  "events.viewCertificate": "प्रमाणपत्र हेर्नुहोस्",

  "messages.title": "सन्देश",
  "messages.newConversation": "नयाँ सन्देश",
  "messages.whatDoYouNeed": "तपाईंलाई केमा सहयोग चाहियो?",
  "messages.topicLearning": "पढाइ",
  "messages.topicEvents": "कार्यक्रम",
  "messages.topicTransport": "यातायात",
  "messages.topicFees": "शुल्क / लेखा",
  "messages.topicAdministration": "प्रशासन",
  "messages.topicWellbeing": "विद्यार्थी कल्याण",
  "messages.topicOther": "अन्य",
  "messages.typeMessage": "सन्देश लेख्नुहोस्",
  "messages.holdToSpeak": "बोल्न थिच्नुहोस्",
  "messages.recording": "रेकर्ड हुँदै…",
  "messages.send": "पठाउनुहोस्",
  "messages.empty": "अहिलेसम्म सन्देश छैन।",
  "messages.voiceMessage": "आवाज सन्देश",
  "messages.photo": "फोटो",
  "messages.document": "कागजात",

  "child.profile": "प्रोफाइल",
  "child.journey": "यात्रा",
  "child.achievements": "उपलब्धिहरू",
  "child.writing": "लेखन र अनुसन्धान",
  "child.certificates": "प्रमाणपत्र",
  "child.events": "कार्यक्रम",
  "child.participation": "सहभागिता",
  "child.schoolsAttended": "पढेका विद्यालयहरू",
  "child.verified": "प्रमाणित",
  "child.certificateId": "प्रमाणपत्र नम्बर",
  "child.viewCertificate": "प्रमाणपत्र हेर्नुहोस्",
  "child.verifyCertificate": "प्रमाणपत्र जाँच्नुहोस्",
  "child.teacherReviewed": "शिक्षकद्वारा समीक्षित",
  "child.noAchievements": "{name} का उपलब्धिहरू यहाँ देखिनेछन्।",
  "child.noWriting": "{name} का प्रकाशित लेखहरू यहाँ देखिनेछन्।",
  "child.noCertificates": "प्रमाणपत्रहरू जारी भएपछि यहाँ देखिनेछन्।",

  "writing.articles": "लेखहरू",
  "writing.research": "अनुसन्धान",
  "writing.creative": "सिर्जनात्मक लेखन",
  "writing.poems": "कविता",
  "writing.blogs": "ब्लग",
  "writing.speeches": "भाषण",

  "settings.title": "सेटिङ",
  "settings.simpleMode": "सरल अभिभावक मोड",
  "settings.simpleModeHelp": "ठूलो अक्षर, थोरै कार्ड, एउटै बटन।",
  "settings.language": "भाषा",
  "settings.dataSaver": "डाटा बचत",
  "settings.dataSaverHelp": "सानो फोटो लोड गर्छ। ढिलो इन्टरनेटमा राम्रो।",
  "settings.notifications": "सूचनाहरू",
  "settings.signOut": "बाहिर निस्कनुहोस्",
  "settings.listen": "सुन्नुहोस्",
  "settings.stopListening": "रोक्नुहोस्",

  "link.title": "आफ्नो बच्चासँग जोडिनुहोस्",
  "link.description":
    "तपाईंको विद्यालयले निमन्त्रणा कोड दिनेछ। यहाँ राख्नुहोस्।",
  "link.codeLabel": "निमन्त्रणा कोड",
  "link.submit": "जोड्नुहोस्",
  "link.contactSchool": "विद्यालयलाई सम्पर्क गर्नुहोस्",
  "link.invalid": "यो कोड मिलेन। विद्यालयसँग जाँच्नुहोस्।",
  "link.success": "{name} सँग जोडियो",

  "common.loading": "लोड हुँदै…",
  "common.retry": "फेरि प्रयास गर्नुहोस्",
  "common.back": "पछाडि",
  "common.close": "बन्द गर्नुहोस्",
  "common.cancel": "रद्द गर्नुहोस्",
  "common.save": "सुरक्षित गर्नुहोस्",
  "common.today": "आज",
  "common.yesterday": "हिजो",
  "common.school": "विद्यालय",
  "common.somethingWrong": "केही गडबड भयो। फेरि प्रयास गर्नुहोस्।",
};

const DICTIONARIES = { en, ne };

export function normalizeLocale(value) {
  const locale = String(value || "").toLowerCase();
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * Resolve a key for a locale, interpolating {placeholders}.
 *
 * Falls back locale → English → the key itself, so a missing Nepali string
 * degrades to readable English rather than to a blank space or a crash.
 */
export function translate(locale, key, params = {}) {
  const dict = DICTIONARIES[normalizeLocale(locale)] || en;
  const template = dict[key] ?? en[key] ?? key;

  if (!params || typeof template !== "string") return template;

  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : match
  );
}

/** Bind `translate` to one locale — what the React hook hands to components. */
export function createTranslator(locale) {
  const active = normalizeLocale(locale);
  const t = (key, params) => translate(active, key, params);
  t.locale = active;
  return t;
}
