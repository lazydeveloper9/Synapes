const { pool } = require('../server');
const router = require('express').Router();
const { protect } = require('../middleware/auth');

router.use(protect);


router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id AS "_id", title, owner_id, width, height, thumbnail, created_at AS "createdAt", updated_at AS "updatedAt" FROM designs WHERE owner_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ designs: rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id AS "_id", title, owner_id, width, height, canvas_data AS "canvasData", thumbnail, is_public AS "isPublic", created_at AS "createdAt", updated_at AS "updatedAt" FROM designs WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Design not found' });
    const design = rows[0];
    if (design.owner_id !== req.user.id && !design.isPublic) return res.status(403).json({ message: 'Access denied' });
    res.json({ design });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, width, height } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO designs (title, owner_id, width, height) VALUES ($1, $2, $3, $4) RETURNING id AS "_id", title, owner_id, width, height, created_at AS "createdAt", updated_at AS "updatedAt"',
      [title || 'Untitled Design', req.user.id, width || 1280, height || 720]
    );
    res.status(201).json({ design: rows[0], message: 'Design created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update design (save canvas)
router.put('/:id', async (req, res) => {
  try {
    const { title, canvasData, thumbnail, width, height } = req.body;
    const check = await pool.query('SELECT owner_id, is_public FROM designs WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Design not found' });
    if (check.rows[0].owner_id !== req.user.id && !check.rows[0].is_public) return res.status(403).json({ message: 'Access denied' });

    const { rows } = await pool.query(
      `UPDATE designs SET title=$1, canvas_data=$2, thumbnail=$3, width=$4, height=$5, updated_at=NOW()
       WHERE id=$6
       RETURNING id AS "_id", title, owner_id, width, height, canvas_data AS "canvasData", thumbnail, updated_at AS "updatedAt"`,
      [title, canvasData, thumbnail, width, height, req.params.id]
    );
    res.json({ design: rows[0], message: 'Design saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT toggle public sharing
router.put('/:id/share', async (req, res) => {
  try {
    const { isPublic } = req.body;
    const check = await pool.query('SELECT owner_id FROM designs WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Design not found' });
    if (check.rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    await pool.query('UPDATE designs SET is_public = $1 WHERE id = $2', [isPublic, req.params.id]);
    res.json({ message: 'Share settings updated', isPublic });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE design
router.delete('/:id', async (req, res) => {
  try {
    const check = await pool.query('SELECT owner_id FROM designs WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Design not found' });
    if (check.rows[0].owner_id !== req.user.id) return res.status(404).json({ message: 'Design not found' });
    await pool.query('DELETE FROM designs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Design deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;