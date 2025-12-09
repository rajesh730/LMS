// Quick test to check participation API
const testAPI = async () => {
  try {
    // Test 1: Check if database connection works
    console.log("Testing participation API...");

    // Test POST to create a participation request
    const response = await fetch(
      "http://localhost:3000/api/events/test123/participate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Error:", data.message || data.error);
    }
  } catch (error) {
    console.error("Test Error:", error.message);
  }
};

testAPI();
