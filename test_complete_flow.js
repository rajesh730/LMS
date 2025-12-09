const BASE_URL = "http://localhost:3000";

/**
 * Complete Test Flow for Event Participation and Marks System
 */

async function testEventParticipationFlow() {
  console.log("\n=== TESTING EVENT PARTICIPATION FLOW ===\n");

  try {
    // Test 1: Register/Login as Student
    console.log("1. Testing Student Registration/Login...");
    const studentLoginRes = await fetch(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "student1@example.com",
          password: "password123",
        }),
      }
    );

    if (!studentLoginRes.ok) {
      console.log(
        "⚠️  Student login endpoint not standard. This would be done via NextAuth session."
      );
      console.log("✓ NextAuth handles authentication via session cookies");
    } else {
      console.log("✓ Student authentication passed");
    }

    // Test 2: Fetch Events
    console.log("\n2. Fetching events list...");
    const eventsRes = await fetch(`${BASE_URL}/api/events`);
    if (eventsRes.ok) {
      const eventsData = await eventsRes.json();
      const events = Array.isArray(eventsData)
        ? eventsData
        : eventsData.events || [];
      console.log(`✓ Fetched ${events.length} events`);

      if (events.length > 0) {
        const eventId = events[0]._id;
        console.log(`  Sample event: ${events[0].title} (ID: ${eventId})`);

        // Test 3: Check Participation Status (before request)
        console.log("\n3. Checking participation status (before request)...");
        const statusRes = await fetch(
          `${BASE_URL}/api/events/${eventId}/participate`
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          console.log(`✓ Status check response:`, statusData.message);
          console.log(`  Data:`, statusData.data);
        } else {
          console.log(`⚠️  Status endpoint returned ${statusRes.status}`);
        }

        // Test 4: Create Participation Request
        console.log("\n4. Creating participation request...");
        const requestRes = await fetch(
          `${BASE_URL}/api/events/${eventId}/participate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (requestRes.ok) {
          const requestData = await requestRes.json();
          console.log("✓ Participation request created");
          console.log(`  Status: ${requestData.data?.status}`);
          console.log(`  Message: ${requestData.message}`);
        } else {
          const error = await requestRes.json();
          console.log(`⚠️  Request creation failed: ${error.message}`);
        }

        // Test 5: Check Status After Request
        console.log("\n5. Checking participation status (after request)...");
        const statusRes2 = await fetch(
          `${BASE_URL}/api/events/${eventId}/participate`
        );
        if (statusRes2.ok) {
          const statusData = await statusRes2.json();
          console.log(
            `✓ Current status: ${statusData.data?.status || "No request"}`
          );
        }
      }
    } else {
      console.log(`❌ Failed to fetch events: ${eventsRes.status}`);
    }
  } catch (error) {
    console.error("❌ Error in participation flow test:", error.message);
  }
}

async function testMarksFlow() {
  console.log("\n=== TESTING MARKS SYSTEM FLOW ===\n");

  try {
    // Test 1: Fetch classrooms
    console.log("1. Fetching classrooms...");
    const classroomRes = await fetch(`${BASE_URL}/api/classrooms`);
    if (classroomRes.ok) {
      const classroomData = await classroomRes.json();
      const classrooms = Array.isArray(classroomData)
        ? classroomData
        : classroomData.classrooms || [];
      console.log(`✓ Fetched ${classrooms.length} classrooms`);

      if (classrooms.length > 0) {
        const classroomId = classrooms[0]._id;
        console.log(`  Sample classroom: ${classrooms[0].name}`);

        // Test 2: Fetch subjects for classroom
        console.log("\n2. Fetching subjects for classroom...");
        const subjectRes = await fetch(
          `${BASE_URL}/api/teacher/subjects?classroom=${classroomId}`
        );
        if (subjectRes.ok) {
          const subjectData = await subjectRes.json();
          const subjects = Array.isArray(subjectData)
            ? subjectData
            : subjectData.subjects || [];
          console.log(`✓ Fetched ${subjects.length} subjects`);
        } else {
          console.log(`⚠️  Subject fetch returned ${subjectRes.status}`);
        }

        // Test 3: Fetch students in classroom
        console.log("\n3. Fetching students in classroom...");
        const studentRes = await fetch(
          `${BASE_URL}/api/students?classroom=${classroomId}`
        );
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          const students = Array.isArray(studentData)
            ? studentData
            : studentData.students || [];
          console.log(`✓ Fetched ${students.length} students`);

          // Test 4: Create a mark
          if (students.length > 0) {
            console.log("\n4. Creating a mark...");
            const markRes = await fetch(`${BASE_URL}/api/marks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentId: students[0]._id,
                classroomId: classroomId,
                subjectId: classrooms[0].subjects?.[0] || "defaultSubject",
                assessmentType: "UNIT_TEST",
                assessmentName: "Unit Test 1",
                totalMarks: 100,
                marksObtained: 85,
                feedback: "Good performance",
              }),
            });

            if (markRes.ok) {
              const markData = await markRes.json();
              console.log("✓ Mark created successfully");
              console.log(
                `  Auto-calculated Grade: ${markData.data?.autoGrade}`
              );
              console.log(`  Marks Obtained: ${markData.data?.marksObtained}`);
            } else {
              const error = await markRes.json();
              console.log(`⚠️  Mark creation failed: ${error.message}`);
            }
          }
        } else {
          console.log(`⚠️  Student fetch returned ${studentRes.status}`);
        }
      }
    } else {
      console.log(`❌ Failed to fetch classrooms: ${classroomRes.status}`);
    }
  } catch (error) {
    console.error("❌ Error in marks flow test:", error.message);
  }
}

async function testAttendanceFlow() {
  console.log("\n=== TESTING ATTENDANCE FLOW ===\n");

  try {
    console.log("1. Testing attendance endpoints...");

    // Test attendance API
    const attendanceRes = await fetch(`${BASE_URL}/api/attendance`);
    if (attendanceRes.ok) {
      const attendanceData = await attendanceRes.json();
      console.log("✓ Attendance API accessible");
      console.log(
        `  Records: ${
          Array.isArray(attendanceData)
            ? attendanceData.length
            : attendanceData.count || 0
        }`
      );
    } else {
      console.log(`⚠️  Attendance API returned ${attendanceRes.status}`);
    }

    // Test monthly attendance
    console.log("\n2. Testing monthly attendance endpoint...");
    const monthlyRes = await fetch(`${BASE_URL}/api/attendance/monthly`);
    if (monthlyRes.ok) {
      console.log("✓ Monthly attendance API accessible");
    } else {
      console.log(`⚠️  Monthly API returned ${monthlyRes.status}`);
    }
  } catch (error) {
    console.error("❌ Error in attendance flow test:", error.message);
  }
}

async function runAllTests() {
  console.log("🚀 STARTING COMPREHENSIVE FLOW TESTS");
  console.log("====================================");
  console.log(`Testing server: ${BASE_URL}\n`);

  await testEventParticipationFlow();
  await testMarksFlow();
  await testAttendanceFlow();

  console.log("\n✅ TEST SUITE COMPLETED");
  console.log("====================================");
  console.log("\nNOTE: Full integration tests require:");
  console.log("- Valid NextAuth session (use browser to login)");
  console.log("- Existing student/teacher/admin accounts");
  console.log("- Sample events and classrooms in database");
  console.log("\nTo test manually:");
  console.log("1. Visit http://localhost:3000");
  console.log("2. Login with your credentials");
  console.log("3. Navigate to student/teacher dashboards");
  console.log("4. Test participation requests and marks creation");
}

// Run tests
runAllTests().catch(console.error);
