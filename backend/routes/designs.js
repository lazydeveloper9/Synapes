const express = require('express');
const Design = require('../models/Design');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

// GET all designs for user
router.get('/', async (req, res) => {
  try {
    const designs = await Design.find({ owner: req.user._id })
      .select('-canvasData')
      .sort({ updatedAt: -1 });
    res.json({ designs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single design
router.get('/:id', async (req, res) => {
  try {
    console.log('Loading design:', req.params.id, 'for user:', req.user._id);
    const design = await Design.findById(req.params.id);
    if (!design) {
      console.log('Design not found');
      return res.status(404).json({ message: 'Design not found' });
    }
    if (!design.owner.equals(req.user._id)) {
      console.log('Design not owned by user');
      return res.status(404).json({ message: 'Design not found' });
    }
    console.log('Design loaded successfully, canvasData length:', design.canvasData?.length || 0);
    res.json({ design });
  } catch (error) {
    console.log('Error loading design:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create design
router.post('/', async (req, res) => {
  try {
    const { title, width, height } = req.body;
    console.log('Creating design for user:', req.user._id, 'with title:', title);
    const design = await Design.create({
      title: title || 'Untitled Design',
      owner: req.user._id,
      width: width || 1280,
      height: height || 720
    });
    console.log('Design created with id:', design._id);
    res.status(201).json({ design, message: 'Design created' });
  } catch (error) {
    console.log('Error creating design:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update design (save canvas)
router.put('/:id', async (req, res) => {
  try {
    const { title, canvasData, thumbnail, width, height } = req.body;
    console.log('Saving design:', req.params.id, 'for user:', req.user._id, 'canvasData length:', canvasData?.length || 0);
    const design = await Design.findById(req.params.id);
    if (!design) {
      console.log('Design not found for update');
      return res.status(404).json({ message: 'Design not found' });
    }
    if (!design.owner.equals(req.user._id)) {
      console.log('Design not owned by user');
      return res.status(404).json({ message: 'Design not found' });
    }
    design.title = title;
    design.canvasData = canvasData;
    design.thumbnail = thumbnail;
    design.width = width;
    design.height = height;
    await design.save();
    console.log('Design saved successfully');
    res.json({ design, message: 'Design saved' });
  } catch (error) {
    console.log('Error saving design:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE design
router.delete('/:id', async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: 'Design not found' });
    if (!design.owner.equals(req.user._id)) return res.status(404).json({ message: 'Design not found' });
    await design.deleteOne();
    res.json({ message: 'Design deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;