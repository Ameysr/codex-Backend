const express = require('express')
const app = express();
require('dotenv').config();
const main =  require('./config/db')
const cookieParser =  require('cookie-parser');
const authRouter = require("./routes/userAuth");
const redisClient = require('./config/redis');
const problemRouter = require("./routes/problemCreator");
const submitRouter = require("./routes/submit")
const aiRouter = require("./routes/aiChatting")
const aiAnalysis = require("./routes/aiAnalysis")
const contestRouter = require("./routes/contestCreation")
const dashboardRouter = require("./routes/dashboard")
const interviewRouter = require("./routes/virtualinterview")
const videoRouter = require("./routes/videoCreator");
const promoRouter = require('./routes/promoRoutes');
const blogRoutes = require('./routes/blogRoutes')
const cors = require('cors')

// console.log("Hello")

app.use(cors({
    origin: 'https://codex-frontend-1v13tq0e0-ameys-projects-a2b1f1d3.vercel.app/',
    credentials: true 
}))

app.use(express.json());
app.use(cookieParser());

app.use('/user',authRouter);
app.use('/problem',problemRouter);
app.use('/submission',submitRouter);
app.use('/ai',aiRouter);
app.use('/analysis',aiAnalysis)
app.use('/contest',contestRouter)
app.use('/dashboard',dashboardRouter)
app.use("/interview",interviewRouter)
app.use("/video",videoRouter);
app.use('/userPromo',promoRouter);
app.use('/blog',blogRoutes);



const InitalizeConnection = async ()=>{
    try{

        await Promise.all([main(),redisClient.connect()]);
        console.log("DB Connected");
        
        app.listen(process.env.PORT, ()=>{
            console.log("Server listening at port number: "+ process.env.PORT);
        })

    }
    catch(err){
        console.log("Error: "+err);
    }
}


InitalizeConnection();

