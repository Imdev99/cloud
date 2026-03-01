require("dotenv").config()
const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const helmet = require("helmet")
const { Low } = require("lowdb")
const { JSONFile } = require("lowdb/node")
const { nanoid } = require("nanoid")
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args))

const app = express()
app.use(express.json())
app.use(cors())
app.use(helmet())

const SECRET = process.env.SECRET || "dev_secret"
const ADMIN_WEBHOOK = process.env.ADMIN_WEBHOOK || ""

const adapter = new JSONFile("db.json")
const db = new Low(adapter, { users: [] })

async function initDB() {
  await db.read()
  db.data ||= { users: [] }
  await db.write()
}
initDB()

function auth(req,res,next){
  const token=req.headers.authorization
  if(!token) return res.sendStatus(401)

  jwt.verify(token,SECRET,(err,user)=>{
    if(err) return res.sendStatus(403)
    req.user=user
    next()
  })
}

app.post("/register", async (req,res)=>{
  const {username,password,webhook}=req.body

  if(!username||!password||!webhook)
    return res.status(400).json({error:"Missing fields"})

  await db.read()

  const exists = db.data.users.find(u=>u.username===username)
  if(exists)
    return res.status(400).json({error:"User exists"})

  const hash = await bcrypt.hash(password,10)

  db.data.users.push({
    id:nanoid(),
    username,
    password:hash,
    webhook,
    role:"user",
    attempts:0,
    locked:false
  })

  await db.write()

  res.json({message:"Registered"})
})

app.post("/login", async (req,res)=>{
app.get("/", (req, res) => {
  res.send("Server is running 🚀")
})
  const {username,password}=req.body
  await db.read()

  const user=db.data.users.find(u=>u.username===username)
  if(!user) return res.status(400).json({error:"Invalid"})

  if(user.locked)
    return res.status(403).json({error:"Locked after 3 attempts"})

  const valid=await bcrypt.compare(password,user.password)
  if(!valid){
    user.attempts++
    if(user.attempts>=3) user.locked=true
    await db.write()
    return res.status(400).json({error:"Invalid"})
  }

  user.attempts=0
  await db.write()

  const token=jwt.sign({
    id:user.id,
    username:user.username,
    role:user.role
  },SECRET,{expiresIn:"2h"})

  res.json({token})
})

app.post("/send",auth, async(req,res)=>{
  await db.read()

  const user=db.data.users.find(u=>u.id===req.user.id)
  if(!user) return res.sendStatus(404)

  const webhook = user.role==="admin"?ADMIN_WEBHOOK:user.webhook

  if(!webhook) return res.status(400).json({error:"No webhook"})

  await fetch(webhook,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      content:`🚀 Mobile Safe SaaS Alert from ${user.username}`
    })
  })

  res.json({message:"Sent"})
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("🔥 Mobile Safe SaaS Running")
})
