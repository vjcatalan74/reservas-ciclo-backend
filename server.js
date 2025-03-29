const express = require('express');
const cors = require('cors');
const app = express();

// Configuración de CORS - Permite conexiones desde tu frontend
app.use(cors({
  origin: [
    'https://tu-frontend.web.app', // URL de tu frontend en producción
    'http://localhost:5000'        // Para desarrollo local
  ]
}));

// Middleware para parsear JSON
app.use(express.json());

// Datos iniciales (en producción usa una base de datos real)
let data = {
  classes: [
    { id: 1, day: "Lunes", time: "18:45" },
    { id: 2, day: "Lunes", time: "19:45" },
    { id: 3, day: "Martes", time: "07:30" },
    { id: 4, day: "Miércoles", time: "18:45" },
    { id: 5, day: "Miércoles", time: "19:45" },
    { id: 6, day: "Jueves", time: "07:00" },
    { id: 7, day: "Viernes", time: "19:30" }
  ],
  reservations: []
};

// Función para calcular la próxima fecha de clase
const getNextClassDate = (targetDay, targetTime) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const now = new Date();
  const targetDayIndex = days.indexOf(targetDay);
  let daysToAdd = (targetDayIndex - now.getDay() + 7) % 7;
  
  const [hours, minutes] = targetTime.split(':').map(Number);
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysToAdd);
  nextDate.setHours(hours, minutes, 0, 0);
  
  if (nextDate < now) nextDate.setDate(nextDate.getDate() + 7);
  return nextDate.toISOString();
};

// Endpoint: Obtener clases disponibles
app.get('/classes', (req, res) => {
  try {
    const now = new Date();
    const maxDate = new Date(now.setDate(now.getDate() + 7));
    
    const classesWithAvailability = data.classes.map(cls => {
      const classDate = new Date(getNextClassDate(cls.day, cls.time));
      const reservations = data.reservations.filter(r => r.classId === cls.id).length;
      
      return {
        ...cls,
        date: classDate.toISOString(),
        availableBikes: 35 - reservations,
        available: classDate > new Date() && classDate <= maxDate
      };
    }).filter(cls => cls.available);
    
    res.json(classesWithAvailability);
  } catch (error) {
    console.error('Error en /classes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint: Obtener reservas de un usuario
app.get('/reservations', (req, res) => {
  try {
    const userName = req.query.userName;
    if (!userName) return res.status(400).json({ error: 'Nombre de usuario requerido' });
    
    const userReservations = data.reservations
      .filter(r => r.userName === userName)
      .map(res => ({
        ...res,
        classDetails: data.classes.find(c => c.id === res.classId)
      }));
      
    res.json(userReservations);
  } catch (error) {
    console.error('Error en /reservations:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint: Crear reserva
app.post('/reserve', (req, res) => {
  try {
    const { classId, userName } = req.body;
    
    // Validaciones
    if (!userName || userName.length < 3) return res.status(400).json({ error: 'Nombre inválido' });
    if (!classId) return res.status(400).json({ error: 'ID de clase requerido' });
    
    const selectedClass = data.classes.find(c => c.id === classId);
    if (!selectedClass) return res.status(404).json({ error: 'Clase no encontrada' });
    
    // Verificar reserva existente
    const existingReservation = data.reservations.find(r => 
      r.classId === classId && r.userName === userName
    );
    if (existingReservation) return res.status(400).json({ error: 'Ya tienes una reserva' });
    
    // Verificar disponibilidad
    if (data.reservations.filter(r => r.classId === classId).length >= 35) {
      return res.status(400).json({ error: 'Clase llena' });
    }
    
    // Crear reserva
    const newReservation = {
      id: Date.now(),
      classId,
      userName,
      date: new Date().toISOString(),
      status: 'active'
    };
    
    data.reservations.push(newReservation);
    res.json({
      ...newReservation,
      classDetails: selectedClass
    });
  } catch (error) {
    console.error('Error en /reserve:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint: Cancelar reserva
app.delete('/cancel/:id', (req, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    const initialLength = data.reservations.length;
    
    data.reservations = data.reservations.filter(r => r.id !== reservationId);
    
    if (data.reservations.length === initialLength) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error en /cancel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Configuración del puerto (ÚNICA declaración)
const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor backend funcionando en puerto ${PORT}`);
  console.log('📌 Endpoints disponibles:');
  console.log(`   http://localhost:${PORT}/classes`);
  console.log(`   http://localhost:${PORT}/reservations?userName=...`);
});