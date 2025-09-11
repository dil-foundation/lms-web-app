#!/usr/bin/env node

/**
 * IRIS Test Script
 * Tests the IRIS system components individually
 */

const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yfaiauooxwvekdimfeuu.supabase.co';
const MCP_ADAPTER_URL = process.env.VITE_MCP_ADAPTER_URL || 'https://mcp-jsonplaceholder.finance-6b9.workers.dev/sse';

console.log('🧪 Testing IRIS System Components...\n');

// Test 1: MCP Server Connection
async function testMCPServer() {
    console.log('1️⃣ Testing MCP Server Connection...');
    console.log(`   URL: ${MCP_ADAPTER_URL}`);
    
    try {
        const response = await fetch(`${MCP_ADAPTER_URL}/tools`);
        
        if (response.ok) {
            const data = await response.json();
            const tools = data.tools || data || [];
            console.log(`   ✅ MCP Server responding: ${tools.length} tools available`);
            
            if (tools.length > 0) {
                const toolNames = tools.map(t => t.function?.name || t.name).filter(Boolean);
                console.log(`   🛠️ Available tools: ${toolNames.join(', ')}`);
            }
            return true;
        } else {
            console.log(`   ❌ MCP Server error: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ MCP Server connection failed: ${error.message}`);
        return false;
    }
}

// Test 2: Supabase Edge Function
async function testSupabaseFunction() {
    console.log('\n2️⃣ Testing Supabase Edge Function...');
    console.log(`   URL: ${SUPABASE_URL}/functions/v1/iris-chat`);
    
    try {
        // This will fail without auth, but we can check if the function exists
        const response = await fetch(`${SUPABASE_URL}/functions/v1/iris-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'test' }],
                context: { userId: 'test', role: 'admin', permissions: [] }
            })
        });
        
        // We expect 401/403 (auth required) or 200 (success)
        if (response.status === 401 || response.status === 403) {
            console.log('   ✅ Supabase Edge Function deployed (auth required)');
            return true;
        } else if (response.status === 200) {
            console.log('   ✅ Supabase Edge Function responding');
            return true;
        } else {
            console.log(`   ❌ Unexpected response: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Supabase function test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Environment Variables
function testEnvironmentVariables() {
    console.log('\n3️⃣ Testing Environment Variables...');
    
    const requiredVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY'
    ];
    
    let allPresent = true;
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`   ✅ ${varName}: Set (${value.substring(0, 20)}...)`);
        } else {
            console.log(`   ❌ ${varName}: Missing`);
            allPresent = false;
        }
    });
    
    return allPresent;
}

// Run all tests
async function runTests() {
    console.log('🚀 IRIS System Test Suite');
    console.log('========================\n');
    
    const results = {
        mcp: await testMCPServer(),
        supabase: await testSupabaseFunction(),
        env: testEnvironmentVariables()
    };
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`MCP Server:        ${results.mcp ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Supabase Function: ${results.supabase ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Environment:       ${results.env ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(r => r);
    
    console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL SYSTEMS GO' : '❌ ISSUES DETECTED'}`);
    
    if (allPassed) {
        console.log('\n🎉 IRIS is ready to use!');
        console.log('   Navigate to /dashboard/iris to start chatting');
    } else {
        console.log('\n🔧 Please fix the issues above before using IRIS');
    }
    
    return allPassed;
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Run the tests
runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
