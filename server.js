import 'dotenv/config';
import express from 'express';
const app=express();
app.use(express.json({limit:'12mb'}));
app.use(express.static('public'));
app.post('/api/analyze',async(req,res)=>{
 const {image}=req.body;
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'ยังไม่ได้ตั้งค่า OPENAI_API_KEY ในไฟล์ .env'});
 if(typeof image!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(image)||image.length>11000000)return res.status(400).json({error:'รูปไม่ถูกต้องหรือใหญ่เกินไป (สูงสุดประมาณ 8 MB)'});
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',max_output_tokens:900,input:[{role:'system',content:'คุณเป็นผู้ช่วยประเมินโภชนาการจากภาพอาหาร ตอบเป็น JSON object เท่านั้น ภาษาไทย ไม่ใส่ markdown ใช้คีย์ name,portion,calories,calories_low,calories_high,protein,carbs,fat,notes. ตัวเลขทั้งหมดเป็นตัวเลขไม่ใช่สตริง ประเมินจากสิ่งที่เห็นเท่านั้น ไม่อ้างความแม่นยำเกินจริง ถ้าไม่ใช่ภาพอาหารให้ name เป็น ไม่พบอาหาร และตัวเลขเป็น 0 แจ้งความไม่แน่นอนของน้ำมัน ซอส ปริมาณใน notes'},{role:'user',content:[{type:'input_text',text:'วิเคราะห์อาหารในภาพนี้ ประเมินปริมาณและโภชนาการ'},{type:'input_image',image_url:image}]}]})});
  const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'API error');
  const txt=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
  const obj=JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g,''));
  for(const k of ['calories','calories_low','calories_high','protein','carbs','fat'])obj[k]=Math.max(0,Number(obj[k])||0);
  res.json(obj);
 }catch(e){res.status(500).json({error:'วิเคราะห์ไม่สำเร็จ: '+e.message});}
});
app.listen(process.env.PORT||3000,()=>console.log(`Calorie Fit AI: http://localhost:${process.env.PORT||3000}`));
