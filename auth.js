const jwt = require('jsonwebtoken');
function requireAuth(req,res,next){ const h=req.headers.authorization||''; const t=h.startsWith('Bearer ')?h.slice(7):null; if(!t)return res.status(401).json({error:'authentication required'}); try{req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch(e){return res.status(401).json({error:'invalid or expired token'})} }
module.exports={requireAuth};
