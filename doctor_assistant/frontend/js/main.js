document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const patientNameInput = document.getElementById('patient-name');
    const selectPatientBtn = document.getElementById('select-patient');
    const newChatBtn = document.getElementById('new-chat');
    const currentPatientSection = document.getElementById('current-patient');
    const patientNameDisplay = document.getElementById('patient-name-display');
    const viewDetailsBtn = document.getElementById('view-details');
    const patientDetailsSection = document.getElementById('patient-details');
    const patientDetailsContent = document.getElementById('patient-details-content');
    const closeDetailsBtn = document.getElementById('close-details');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    
    // Current patient state
    let currentPatient = null;
    
    // API base URL
    const API_URL = 'http://localhost:5000/api';
    
    // Function to set current patient
    async function setCurrentPatient() {
      const patientName = patientNameInput.value.trim();
      
      if (!patientName) {
        alert('Please enter a patient name');
        return;
      }
      
      try {
        // Try to get patient from database
        const response = await fetch(`${API_URL}/patients/${patientName}`);
        const data = await response.json();
        
        if (data.success) {
          // Patient exists
          currentPatient = data.data;
          displayCurrentPatient();
          
          // Add system message
          addMessage(`Patient ${patientName} selected. I have access to their medical records.`, 'assistant');
        } else {
          // Patient doesn't exist, create new patient
          const createResponse = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: patientName })
          });
          
          const createData = await createResponse.json();
          
          if (createData.success) {
            currentPatient = createData.data;
            displayCurrentPatient();
            
            // Add system message
            addMessage(`New patient ${patientName} created. No medical records available yet.`, 'assistant');
          } else {
            throw new Error(createData.message || 'Error creating patient');
          }
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error setting patient: ' + error.message);
      }
    }
    
    // Function to display current patient info
    function displayCurrentPatient() {
      if (currentPatient) {
        patientNameDisplay.textContent = currentPatient.name;
        currentPatientSection.classList.remove('hidden');
      } else {
        currentPatientSection.classList.add('hidden');
      }
    }
    
    // Function to view patient details
    function viewPatientDetails() {
      if (!currentPatient) return;
      
      let detailsHTML = '<dl>';
      
      // Basic info
      detailsHTML += `<dt>Name:</dt><dd>${currentPatient.name}</dd>`;
      
      // Conditions
      if (currentPatient.conditions && currentPatient.conditions.length > 0) {
        detailsHTML += `<dt>Conditions:</dt><dd>${currentPatient.conditions.join(', ')}</dd>`;
      } else {
        detailsHTML += `<dt>Conditions:</dt><dd>No conditions recorded</dd>`;
      }
      
      // Medications
      if (currentPatient.medications && currentPatient.medications.length > 0) {
        detailsHTML += `<dt>Medications:</dt><dd>${currentPatient.medications.join(', ')}</dd>`;
      } else {
        detailsHTML += `<dt>Medications:</dt><dd>No medications recorded</dd>`;
      }
      
      // Medical History
      if (currentPatient.medicalHistory && Object.keys(currentPatient.medicalHistory).length > 0) {
        detailsHTML += `<dt>Medical History:</dt><dd>`;
        for (const [key, value] of Object.entries(currentPatient.medicalHistory)) {
          detailsHTML += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        detailsHTML += `</dd>`;
      } else {
        detailsHTML += `<dt>Medical History:</dt><dd>No medical history recorded</dd>`;
      }
      
      // Test Results
      if (currentPatient.testResults && Object.keys(currentPatient.testResults).length > 0) {
        detailsHTML += `<dt>Test Results:</dt><dd>`;
        for (const [key, value] of Object.entries(currentPatient.testResults)) {
          detailsHTML += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        detailsHTML += `</dd>`;
      } else {
        detailsHTML += `<dt>Test Results:</dt><dd>No test results recorded</dd>`;
      }
      
      detailsHTML += '</dl>';
      
      patientDetailsContent.innerHTML = detailsHTML;
      patientDetailsSection.classList.remove('hidden');
    }
    
    // Function to close patient details
    function closePatientDetails() {
      patientDetailsSection.classList.add('hidden');
    }
    
    // Function to add a message to the chat
    function addMessage(text, sender) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message', `${sender}-message`);
      messageElement.textContent = text;
      chatMessages.appendChild(messageElement);
      
      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to send message to the backend
    async function sendMessage() {
      const message = messageInput.value.trim();
      
      if (!message) return;
      
      // Add user message to chat
      addMessage(message, 'user');
      
      // Clear input
      messageInput.value = '';
      
      // Create loading message
      const loadingElement = document.createElement('div');
      loadingElement.classList.add('message', 'assistant-message');
      const spinner = document.createElement('div');
      spinner.classList.add('spinner');
      loadingElement.appendChild(spinner);
      chatMessages.appendChild(loadingElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
      try {
        // Send message to backend
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            patientName: currentPatient ? currentPatient.name : null
          })
        });
        
        const data = await response.json();
        
        // Remove loading message
        chatMessages.removeChild(loadingElement);
        
        if (data.success) {
          // Add assistant response to chat
          addMessage(data.data.message, 'assistant');
          
          // If patient data was updated, refresh patient info
          if (currentPatient && data.data.patientInfo) {
            currentPatient = data.data.patientInfo;
          }
        } else {
          throw new Error(data.message || 'Error processing message');
        }
      } catch (error) {
        // Remove loading message
        chatMessages.removeChild(loadingElement);
        
        console.error('Error:', error);
        addMessage('Sorry, there was an error processing your message. Please try again.', 'assistant');
      }
    }
    
    // Function to refresh the chat
    function refreshChat() {
      // Clear chat messages
      chatMessages.innerHTML = '';
      
      // Reset current patient
      currentPatient = null;
      currentPatientSection.classList.add('hidden');
      
      // Clear patient name input
      patientNameInput.value = '';
      
      // Close patient details if open
      patientDetailsSection.classList.add('hidden');
      
      // Add welcome message
      addMessage('Welcome to the Doctor\'s Assistant! Please select a patient to begin.', 'assistant');
    }
    
    // Event Listeners
    selectPatientBtn.addEventListener('click', setCurrentPatient);
    viewDetailsBtn.addEventListener('click', viewPatientDetails);
    closeDetailsBtn.addEventListener('click', closePatientDetails);
    newChatBtn.addEventListener('click', refreshChat);
    
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Initialize with welcome message
    addMessage('Welcome to the Doctor\'s Assistant! Please select a patient to begin.', 'assistant');
  });