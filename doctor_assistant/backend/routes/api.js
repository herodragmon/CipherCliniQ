const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const axios = require('axios');
require('dotenv').config();

// Patient routes
router.get('/patients/:name', patientController.getPatientByName);
router.post('/patients', patientController.createOrUpdatePatient);
router.put('/patients/:name', patientController.updatePatientField);

// Groq AI chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, patientName } = req.body;
    
    // First check if patient exists
    let patientInfo = null;
    if (patientName) {
      try {
        const patientResponse = await axios.get(`http://localhost:5000/api/patients/${patientName}`);
        if (patientResponse.data.success) {
          patientInfo = patientResponse.data.data;
        }
      } catch (error) {
        console.log('Patient not found or error retrieving patient data');
      }
    }
    
    // Prepare system prompt with patient context if available
    let systemPrompt = "You are a medical assistant helping doctors with patient information. Be professional and concise.";
    
    if (patientInfo) {
      systemPrompt += " Here is the patient information in the database:";
      systemPrompt += `\nName: ${patientInfo.name}`;
      
      if (patientInfo.conditions && patientInfo.conditions.length > 0) {
        systemPrompt += `\nConditions: ${patientInfo.conditions.join(', ')}`;
      }
      
      if (patientInfo.medications && patientInfo.medications.length > 0) {
        systemPrompt += `\nMedications: ${patientInfo.medications.join(', ')}`;
      }
      
      if (patientInfo.medicalHistory && Object.keys(patientInfo.medicalHistory).length > 0) {
        systemPrompt += '\nMedical History:';
        for (const [key, value] of Object.entries(patientInfo.medicalHistory)) {
          systemPrompt += `\n- ${key}: ${value}`;
        }
      }
      
      if (patientInfo.testResults && Object.keys(patientInfo.testResults).length > 0) {
        systemPrompt += '\nTest Results:';
        for (const [key, value] of Object.entries(patientInfo.testResults)) {
          systemPrompt += `\n- ${key}: ${value}`;
        }
      }
    }
    
    // Make request to Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',  // or your preferred Groq model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract medical data from AI response to update patient record
    const aiResponse = response.data.choices[0].message.content;
    
    // Check if we need to update patient database based on the conversation
    if (patientName && message.toLowerCase().includes('i have') || message.toLowerCase().includes('diagnosed with')) {
      // This is a simple extraction logic - in a real app you'd use more sophisticated NLP
      const possibleConditions = aiResponse.match(/diagnosed with ([^.]+)/i) ||
                                aiResponse.match(/you have ([^.]+)/i) ||
                                message.match(/I have ([^.]+)/i);
      
      if (possibleConditions && possibleConditions[1]) {
        const condition = possibleConditions[1].trim();
        
        // Update patient record with the new condition
        try {
          await axios.put(`http://localhost:5000/api/patients/${patientName}`, {
            field: 'conditions',
            value: condition
          });
        } catch (error) {
          console.error('Error updating patient record:', error);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        message: aiResponse,
        patientInfo: patientInfo
      }
    });
  } catch (error) {
    console.error('Error with Groq API:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      message: 'Error processing your request',
      error: error.response ? error.response.data : error.message
    });
  }
});

module.exports = router;