// Test script for Qwen API with real image
const fs = require('fs');
const path = require('path');

// Read the workflow JSON and add meta_data
const workflowPath = path.join(__dirname, '../Desktop/bcc_workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

// Ensure meta_data exists
if (!workflow.meta_data) {
  workflow.meta_data = {};
}

// Convert to base64
const workflowBase64 = Buffer.from(JSON.stringify(workflow)).toString('base64');

// Read a test image (create a simple valid image)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x0a, // 10x10 image
  0x08, 0x02, 0x00, 0x00, 0x00, 0x02, 0x50, 0x58,
  0xea, 0x00, 0x00, 0x00, 0x01, 0x73, 0x52, 0x47,
  0x42, 0x00, 0xae, 0xce, 0x1c, 0xe9, 0x00, 0x00,
  0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x18, 0x57,
  0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe,
  0x02, 0xfe, 0xa7, 0x35, 0x81, 0x84, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82
]);

const imageBase64 = testImageBuffer.toString('base64');

console.log('Workflow structure:');
console.log('- Has prompt:', !!workflow.prompt);
console.log('- Has meta_data:', !!workflow.meta_data);
console.log('- Has extra_data:', !!workflow.extra_data);
console.log('- Workflow base64 length:', workflowBase64.length);
console.log('- Image base64 length:', imageBase64.length);

// Prepare test request
const testRequest = {
  workflow: workflowBase64,
  image: imageBase64,
  propmt: "把图中的人物换装成兔女郎装扮",
  seed: 10,
  output_image: ""
};

const API_URL = 'https://u166586-ac0b-dea6e436.westc.gpuhub.com:8443/sync_prompt';

console.log('\n=== Making request to Qwen API ===\n');

fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testRequest),
})
  .then(async (response) => {
    console.log('✅ Response status:', response.status);
    
    const text = await response.text();
    console.log('\n📝 Response (first 1000 chars):');
    console.log(text.substring(0, 1000));
    
    try {
      const json = JSON.parse(text);
      console.log('\n✅ Successfully parsed JSON:');
      console.log('- code:', json.code);
      console.log('- message:', json.msg || json.message);
      console.log('- has data:', !!json.data);
      console.log('- has image:', !!json.data?.image);
      if (json.data?.image) {
        console.log('- image length:', json.data.image.length);
      }
      
      // Write full response to file for inspection
      fs.writeFileSync('/tmp/qwen-response.json', JSON.stringify(json, null, 2));
      console.log('\n💾 Full response saved to /tmp/qwen-response.json');
      
    } catch (e) {
      console.log('\n❌ Could not parse as JSON:', e.message);
      // Write text response to file
      fs.writeFileSync('/tmp/qwen-response.txt', text);
      console.log('💾 Raw response saved to /tmp/qwen-response.txt');
    }
  })
  .catch((error) => {
    console.error('\n❌ Request failed:', error.message);
  });

