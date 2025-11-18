// Test script for Qwen API
const fs = require('fs');
const path = require('path');

// Read the workflow JSON
const workflowPath = path.join(__dirname, '../Desktop/bcc_workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

// Add meta_data if missing
if (!workflow.meta_data) {
  workflow.meta_data = {};
}

// Convert to base64
const workflowBase64 = Buffer.from(JSON.stringify(workflow)).toString('base64');

console.log('Workflow structure check:');
console.log('- Has prompt:', !!workflow.prompt);
console.log('- Has meta_data:', !!workflow.meta_data);
console.log('- Has extra_data:', !!workflow.extra_data);
console.log('\nBase64 length:', workflowBase64.length);
console.log('\nFirst 100 chars of base64:', workflowBase64.substring(0, 100));

// Prepare test request
const testRequest = {
  workflow: workflowBase64,
  image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // 1x1 pixel PNG
  propmt: "把图中的人物换装成兔女郎装扮",
  seed: 10,
  output_image: ""
};

console.log('\nTest request structure:');
console.log('- workflow length:', testRequest.workflow.length);
console.log('- image length:', testRequest.image.length);
console.log('- propmt:', testRequest.propmt);
console.log('- seed:', testRequest.seed);

// Try to make the request
const API_URL = process.env.QWEN_API_URL || 'https://u166586-ac0b-dea6e436.westc.gpuhub.com:8443/sync_prompt';

console.log('\n\n=== Making test request to:', API_URL, '===\n');

fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testRequest),
})
  .then(async (response) => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('\nResponse body (first 500 chars):');
    console.log(text.substring(0, 500));
    
    try {
      const json = JSON.parse(text);
      console.log('\n\nParsed JSON:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('\nCould not parse as JSON:', e.message);
    }
  })
  .catch((error) => {
    console.error('\nRequest failed:', error.message);
    console.error(error.stack);
  });

