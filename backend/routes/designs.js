const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all designs for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const designs = await prisma.design.findMany({
      where: { ownerId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(designs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Create a new design
router.post('/', protect, async (req, res) => {
  try {
    const { title, canvasData, width, height } = req.body;
    
    const design = await prisma.design.create({
      data: {
        title: title || 'Untitled Design',
        canvasData: canvasData || '{}',
        width: width || 1280,
        height: height || 720,
        ownerId: req.user.id
      }
    });
    res.status(201).json(design);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Get a specific design
router.get('/:id', protect, async (req, res) => {
  try {
    const design = await prisma.design.findUnique({
      where: { id: req.params.id }
    });
    
    if (!design) return res.status(404).json({ message: 'Design not found' });
    if (design.ownerId !== req.user.id && !design.isPublic) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    res.json(design);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;