const express = require('express')
const app = express()
const port = 3000
const pool = require("./config/database")
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded


//add new todo by title description due_date
app.post('/todo', async (req, res, next) => {
  console.log(req.body)
  // เริ่มต้นทำงาน
  const conn = await pool.getConnection();
  await conn.beginTransaction();


  const { title, description, due_date } = req.body
  try {
    // ตรวจสอบว่ามีการส่ง title มาหรือไม่
    if (!title) {
      return res.status(400).json({
        message: 'ต้องกรอก title'
      })
    }
    // ตรวจสอบว่ามีการส่ง description มาหรือไม่
    if (!description) {
      return res.status(400).json({
        message: 'ต้องกรอก description'
      })
    }

    const max_data = await conn.query("SELECT MAX(`order`) AS max FROM todo")
    const max_order = max_data[0][0].max + 1


    // ตรวจสอบว่ามีการส่ง due_date มาหรือไม่
    if (due_date) {
      const [rows, fields] = await conn.query("INSERT INTO todo (title, description, due_date, todo.order) VALUES (?, ?, ?, ?)", [title, description, due_date, max_order])
      const detail = await conn.query(`SELECT *, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date  FROM todo WHERE id = ${rows.insertId}`)

      return res.status(201).json({
        'message': `สร้าง ToDo '${title}' สำเร็จ`,
        'todo': detail[0][0]
      })
    }

    else {
      const [rows, fields] = await conn.query("INSERT INTO todo (title, description, due_date, todo.order) VALUES (?, ?, DATE_FORMAT(TIMESTAMP, '%Y-%m-%d'), ?)", [title, description, max_order])
      const detail = await conn.query(`SELECT *, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date  FROM todo WHERE id = ${rows.insertId}`)
      return res.status(201).json({
        message: `สร้าง ToDo '${title}' สำเร็จ`,
        todo: detail[0][0]
      })
    }
  }
  catch (err) {
    console.log(err)
    next(err)
    conn.rollback();
  }
  finally {
    await conn.commit();
    conn.release();
  }
})

//get all todo
app.get('/todo', async (req, res) => {
  const { start_date, end_date } = req.query;

  if (start_date && end_date) {
    try {
      const [rows] = await pool.query(`
        SELECT *, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
        FROM todo
        WHERE due_date BETWEEN ? AND ?
      `, [start_date, end_date]);

      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    try {
      const [rows] = await pool.query(`
        SELECT *, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
        FROM todo
      `);

      return res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});


//delete todo by id
app.delete('/todo/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  const { id } = req.params

  try {
    const [rows, fields] = await conn.query("SELECT * FROM todo WHERE id=?", [id])
    if (!rows[0]) {
      return res.status(404).json({
        message: 'ไม่พบ ToDo ที่ต้องการลบ'
      })
    }
    const message_delete = rows[0].title

    const [row, field] = await conn.query("DELETE FROM todo WHERE id=?", [id])
    return res.status(200).json({
      message:`ลบ ToDo \'${message_delete}\' สำเร็จ`
    })
  }
  catch (err) {
    console.log(err)
    next(err)
    conn.rollback();
  }
  finally {
    await conn.commit();
    conn.release();
  }
})

module.exports = app
