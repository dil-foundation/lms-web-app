// Debug script to test meeting creation
// Run this in your browser console to debug the meeting creation issue

console.log("=== Meeting Creation Debug Script ===");

// Test 1: Check if integrations table is accessible
async function testIntegrationsAccess() {
  console.log("\n1. Testing integrations table access...");
  try {
    const { data, error } = await window.supabase
      .from('integrations')
      .select('*');
    
    if (error) {
      console.error("❌ Error accessing integrations table:", error);
      return false;
    } else {
      console.log("✅ Integrations table accessible");
      console.log("Integrations found:", data);
      
      // Check specifically for zoom integration
      const zoomIntegration = data.find(i => i.name === 'zoom');
      if (zoomIntegration) {
        console.log("✅ Zoom integration found:", zoomIntegration);
        return zoomIntegration.status === 'enabled' && zoomIntegration.is_configured;
      } else {
        console.log("❌ Zoom integration not found");
        return false;
      }
    }
  } catch (err) {
    console.error("❌ Exception accessing integrations:", err);
    return false;
  }
}

// Test 2: Check if zoom_meetings table is accessible
async function testZoomMeetingsAccess() {
  console.log("\n2. Testing zoom_meetings table access...");
  try {
    const { data, error } = await window.supabase
      .from('zoom_meetings')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error("❌ Error accessing zoom_meetings table:", error);
      return false;
    } else {
      console.log("✅ zoom_meetings table accessible");
      return true;
    }
  } catch (err) {
    console.error("❌ Exception accessing zoom_meetings:", err);
    return false;
  }
}

// Test 3: Check current user authentication
async function testUserAuth() {
  console.log("\n3. Testing user authentication...");
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) {
      console.error("❌ Auth error:", error);
      return null;
    }
    
    if (user) {
      console.log("✅ User authenticated:", user.id, user.email);
      return user;
    } else {
      console.log("❌ No authenticated user");
      return null;
    }
  } catch (err) {
    console.error("❌ Exception checking auth:", err);
    return null;
  }
}

// Test 4: Try to create a test meeting
async function testMeetingCreation(userId) {
  console.log("\n4. Testing meeting creation...");
  
  const testMeeting = {
    title: "Test Meeting - Debug",
    description: "This is a test meeting created by debug script",
    meeting_type: "1-on-1",
    scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration: 30,
    teacher_id: userId,
    student_id: null, // We'll leave this null for now
    course_id: null,
    status: "scheduled"
  };
  
  try {
    const { data, error } = await window.supabase
      .from('zoom_meetings')
      .insert(testMeeting)
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error creating test meeting:", error);
      console.log("Meeting data that failed:", testMeeting);
      return false;
    } else {
      console.log("✅ Test meeting created successfully:", data);
      
      // Clean up - delete the test meeting
      const { error: deleteError } = await window.supabase
        .from('zoom_meetings')
        .delete()
        .eq('id', data.id);
      
      if (deleteError) {
        console.warn("⚠️ Could not delete test meeting:", deleteError);
      } else {
        console.log("✅ Test meeting cleaned up");
      }
      
      return true;
    }
  } catch (err) {
    console.error("❌ Exception creating meeting:", err);
    return false;
  }
}

// Run all tests
async function runDebugTests() {
  console.log("Starting debug tests...");
  
  const user = await testUserAuth();
  if (!user) {
    console.log("❌ Cannot proceed without authenticated user");
    return;
  }
  
  const integrationsOk = await testIntegrationsAccess();
  const meetingsTableOk = await testZoomMeetingsAccess();
  
  if (integrationsOk && meetingsTableOk) {
    await testMeetingCreation(user.id);
  }
  
  console.log("\n=== Debug Summary ===");
  console.log("User authenticated:", !!user);
  console.log("Integrations table accessible:", integrationsOk);
  console.log("Zoom meetings table accessible:", meetingsTableOk);
  
  if (!integrationsOk) {
    console.log("\n🔧 Fix: Run the SQL script 'fix_meeting_creation_issues.sql' in your database");
  }
}

// Auto-run the tests
runDebugTests().catch(console.error);

// Also expose individual test functions for manual testing
window.debugMeetingCreation = {
  testIntegrationsAccess,
  testZoomMeetingsAccess,
  testUserAuth,
  testMeetingCreation,
  runDebugTests
};
