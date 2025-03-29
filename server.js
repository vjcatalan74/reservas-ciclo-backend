const PORT = process.env.PORT || 3000; // Render asigna su propio puerto
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors({ origin: '*' })); // Permite CORS desde cualquier origen
const DATA_FILE = 'data.json';

// Configuración inicial mejorada
let data = (() => {
    try {
        return fs.existsSync(DATA_FILE) ? 
            JSON.parse(fs.readFileSync(DATA_FILE)) : 
            {
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
    } catch (error) {
        console.error('Error loading data:', error);
        process.exit(1);
    }
})();

const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
};

// Función de fecha optimizada
const getNextClassDate = (targetDay, targetTime) => {
    const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const now = new Date();
    const currentDay = now.getDay();
    const targetDayIndex = days.indexOf(targetDay);
    
    let daysToAdd = (targetDayIndex - currentDay + 7) % 7;
    const [hours, minutes] = targetTime.split(':').map(Number);
    
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysToAdd);
    nextDate.setHours(hours, minutes, 0, 0);
    
    if (nextDate < now) nextDate.setDate(nextDate.getDate() + 7);
    
    return nextDate.toISOString();
};

// Endpoints mejorados
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
        console.error('Error in /classes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

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
        console.error('Error in /reservations:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/reserve', (req, res) => {
    try {
        const { classId, userName } = req.body;
        if (!userName || userName.length < 3) return res.status(400).json({ error: 'Nombre inválido' });
        if (!classId) return res.status(400).json({ error: 'ID de clase requerido' });
        
        const selectedClass = data.classes.find(c => c.id === classId);
        if (!selectedClass) return res.status(404).json({ error: 'Clase no encontrada' });
        
        const existingReservation = data.reservations.find(r => 
            r.classId === classId && r.userName === userName
        );
        if (existingReservation) return res.status(400).json({ error: 'Ya tienes una reserva' });
        
        if (data.reservations.filter(r => r.classId === classId).length >= 35) {
            return res.status(400).json({ error: 'Clase llena' });
        }
        
        const newReservation = {
            id: Date.now(),
            classId,
            userName,
            date: new Date().toISOString(),
            status: 'active'
        };
        
        data.reservations.push(newReservation);
        saveData();
        
        res.json({
            ...newReservation,
            classDetails: selectedClass
        });
    } catch (error) {
        console.error('Error in /reserve:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/cancel/:id', (req, res) => {
    try {
        const reservationId = parseInt(req.params.id);
        const initialLength = data.reservations.length;
        
        data.reservations = data.reservations.filter(r => r.id !== reservationId);
        
        if (data.reservations.length === initialLength) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        
        saveData();
        res.json({ success: true });
    } catch (error) {
        console.error('Error in /cancel:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor activo en http://localhost:${PORT}`);
    console.log('🔁 Endpoints disponibles:');
    console.log(`   GET  /classes`);
    console.log(`   GET  /reservations?userName=...`);
    console.log(`   POST /reserve`);
    console.log(`   DELETE /cancel/:id`);
});