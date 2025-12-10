const express = require('express')
const app =express();



app.get('/',(req,res)=>{
    res.send("server is runnig..")
})

const port=3000;
app.listen(port,()=>{
    console.log(`server runnig on port ${port}`);
});