const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

// Public: submit a lead
router.post('/', leadController.submitLead);

module.exports = router;