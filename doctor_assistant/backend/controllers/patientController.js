const Patient = require('../models/Patient');

// Get patient by name
exports.getPatientByName = async (req, res) => {
  try {
    const name = req.params.name;
    const patient = await Patient.findOne({ name: { $regex: new RegExp(name, 'i') } });
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create or update patient
exports.createOrUpdatePatient = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Patient name is required' });
    }
    
    // Find if patient exists
    let patient = await Patient.findOne({ name: { $regex: new RegExp(name, 'i') } });
    
    if (patient) {
      // Update existing patient
      patient = await Patient.findOneAndUpdate(
        { name: { $regex: new RegExp(name, 'i') } },
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );
    } else {
      // Create new patient
      patient = await Patient.create(req.body);
    }
    
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update specific patient field (for adding conditions, medications, etc.)
exports.updatePatientField = async (req, res) => {
  try {
    const { name } = req.params;
    const { field, value } = req.body;
    
    const allowedFields = ['conditions', 'medications', 'testResults', 'medicalHistory'];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ 
        success: false, 
        message: `Field must be one of: ${allowedFields.join(', ')}` 
      });
    }
    
    const patient = await Patient.findOne({ name: { $regex: new RegExp(name, 'i') } });
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    
    // Handle arrays (conditions, medications)
    if (Array.isArray(patient[field])) {
      if (!patient[field].includes(value)) {
        patient[field].push(value);
      }
    } 
    // Handle objects (medicalHistory, testResults)
    else if (typeof patient[field] === 'object') {
      // If value is an object, we merge it
      if (typeof value === 'object') {
        patient[field] = { ...patient[field], ...value };
      } 
      // If it's a simple key-value pair
      else if (req.body.key) {
        patient[field][req.body.key] = value;
      }
    }
    
    patient.updatedAt = Date.now();
    await patient.save();
    
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};