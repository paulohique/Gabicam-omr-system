const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const provasRoutes = require('./routes/provas');

console.log('🚀 Iniciando servidor...');

const app = express();

// Configuração do CORS para aceitar conexões de qualquer origem
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'matricula']
}));

app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Rotas
app.use('/api', authRoutes);
app.use('/api/provas', provasRoutes);

// Rota de teste
app.get('/test', (req, res) => {
  console.log('✅ Rota de teste acessada');
  res.json({ message: 'API está funcionando!' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Permite conexões de qualquer IP

app.listen(PORT, HOST, () => {
  console.log(`✅ Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`🌐 Acessível em:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://172.20.10.4:${PORT}`);
}); 