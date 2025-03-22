// Componente para añadir vibraciones a la cámara según la velocidad y altitud
AFRAME.registerComponent('camera-vibration', {
    schema: {
        // Umbrales de velocidad para activar diferentes niveles de vibración
        lowSpeedThreshold: { type: 'number', default: 0.5 },  // Como fracción de maxSpeed
        mediumSpeedThreshold: { type: 'number', default: 0.8 }, // Como fracción de maxSpeed
        highSpeedThreshold: { type: 'number', default: 1.2 },  // Como fracción de maxSpeed
        
        // Umbrales de altitud para activar diferentes niveles de vibración
        lowAltitudeThreshold: { type: 'number', default: 5 },  // En unidades de altura
        criticalAltitudeThreshold: { type: 'number', default: 2 }, // En unidades de altura
        
        // Intensidad de las vibraciones
        lowIntensity: { type: 'number', default: 0.04 },
        mediumIntensity: { type: 'number', default: 0.1 },
        highIntensity: { type: 'number', default: 0.2 },
        extremeIntensity: { type: 'number', default: 0.4 },
        
        // Velocidad de las vibraciones
        lowFrequency: { type: 'number', default: 10 },
        mediumFrequency: { type: 'number', default: 15 },
        highFrequency: { type: 'number', default: 25 },
        
        // Activar/desactivar la vibración
        enabled: { type: 'boolean', default: true }
    },
    
    init: function() {
        // Como el componente se aplicará directamente al mismo elemento que tiene flight-controls
        // vamos a obtener la referencia directamente
        this.flightControls = this.el.components['flight-controls'];
        
        if (!this.flightControls) {
            console.error('No se encontró el componente flight-controls en este elemento');
            return;
        }
        
        // Posición original de la cámara (relativa)
        this.originalPosition = new THREE.Vector3(0, 0, 0);
        
        // Para controlar la vibración
        this.vibrationOffset = new THREE.Vector3(0, 0, 0);
        this.vibrationPhase = 0;
        
        // Estado de la vibración
        this.isVibrating = false;
        this.currentIntensity = 0;
        this.currentFrequency = 0;
        
        // Información para debug
        this.createVibrationDebugUI();
        
        // Aplicar la vibración al HUD también 
        this.hudElement = this.el.querySelector('a-entity[position="0 0 -0.5"]');
        this.hudOriginalPosition = new THREE.Vector3(0, 0, -0.5);
    },
    
    createVibrationDebugUI: function() {
        const debugUI = document.createElement('div');
        debugUI.id = 'vibration-debug';
        debugUI.style.position = 'fixed';
        debugUI.style.top = '20px';
        debugUI.style.right = '20px';
        debugUI.style.background = 'rgba(0, 0, 0, 0.5)';
        debugUI.style.color = 'white';
        debugUI.style.padding = '10px';
        debugUI.style.borderRadius = '5px';
        debugUI.style.fontFamily = 'monospace';
        debugUI.style.zIndex = '9998';
        debugUI.innerHTML = 'Vibración: Ninguna';
        document.body.appendChild(debugUI);
        this.debugUI = debugUI;
    },
    
    updateDebugUI: function(level) {
        if (this.debugUI) {
            this.debugUI.innerHTML = `Vibración: ${level} (I: ${this.currentIntensity.toFixed(3)}, F: ${this.currentFrequency.toFixed(1)})`;
            
            // Cambiar color según nivel de vibración
            switch(level) {
                case 'Ninguna':
                    this.debugUI.style.color = 'white';
                    break;
                case 'Baja':
                    this.debugUI.style.color = 'cyan';
                    break;
                case 'Media':
                    this.debugUI.style.color = 'yellow';
                    break;
                case 'Alta':
                    this.debugUI.style.color = 'orange';
                    break;
                case 'Extrema':
                    this.debugUI.style.color = 'red';
                    this.debugUI.style.fontWeight = 'bold';
                    break;
                default:
                    this.debugUI.style.color = 'white';
            }
        }
    },
    
    tick: function(time, deltaTime) {
        if (!deltaTime || !this.data.enabled || !this.flightControls) return;
        
        const deltaSeconds = deltaTime / 1000;
        
        // Obtener datos actuales del vuelo - Importante: usando los datos correctos de tu configuración
        // Nota: Como tienes maxSpeed: 0, tendremos que usar valores absolutos para calcular la vibración
        
        // Velocidad real calculada en el componente flight-controls
        const currentSpeed = this.flightControls.currentSpeed || 0;
        
        // Como maxSpeed está en 0 en tu HTML, usaremos un valor de referencia 
        // basado en los valores de velocidad del código original
        const referenceMaxSpeed = 2.0; // Valor de maxSpeed estándar en el componente original
        const speedRatio = currentSpeed / referenceMaxSpeed;
        
        const altitude = this.flightControls.altitude || 0;
        const pitch = this.flightControls.pitch || 0;
        
        // Determinar nivel de vibración basado en velocidad y altitud
        let vibrationLevel = 'Ninguna';
        let intensity = 0;
        let frequency = 0;
        
        // 1. Evaluar por velocidad absoluta (ya que maxSpeed es 0)
        if (currentSpeed >= referenceMaxSpeed * this.data.highSpeedThreshold) {
            vibrationLevel = 'Alta';
            intensity = this.data.highIntensity;
            frequency = this.data.highFrequency;
        } else if (currentSpeed >= referenceMaxSpeed * this.data.mediumSpeedThreshold) {
            vibrationLevel = 'Media';
            intensity = this.data.mediumIntensity;
            frequency = this.data.mediumFrequency;
        } else if (currentSpeed >= referenceMaxSpeed * this.data.lowSpeedThreshold) {
            vibrationLevel = 'Baja';
            intensity = this.data.lowIntensity;
            frequency = this.data.lowFrequency;
        }
        
        // 2. Evaluar por altitud (prioridad sobre velocidad)
        if (altitude <= this.data.criticalAltitudeThreshold) {
            vibrationLevel = 'Extrema';
            intensity = this.data.extremeIntensity;
            frequency = this.data.highFrequency;
        } else if (altitude <= this.data.lowAltitudeThreshold) {
            // Solo aumentar vibración si la actual es menor que la que correspondería por altitud
            if (intensity < this.data.highIntensity) {
                vibrationLevel = 'Alta';
                intensity = this.data.highIntensity;
                frequency = this.data.highFrequency;
            }
        }
        
        // 3. Aumentar vibración si hay cambio rápido de pitch (inclinación)
        const pitchAbsolute = Math.abs(pitch);
        if (pitchAbsolute > 0.5) {  // Más de ~30 grados
            // Factores de aumento basados en la inclinación
            const pitchFactor = THREE.MathUtils.clamp(pitchAbsolute * 2 - 1, 0, 1);
            intensity += this.data.mediumIntensity * pitchFactor;
            frequency += this.data.mediumFrequency * pitchFactor;
            
            if (vibrationLevel === 'Ninguna') {
                vibrationLevel = 'Media';
            } else if (vibrationLevel === 'Baja') {
                vibrationLevel = 'Media';
            }
        }
        
        // Actualizar el estado de vibración
        this.isVibrating = intensity > 0;
        this.currentIntensity = intensity;
        this.currentFrequency = frequency;
        
        // Actualizar interfaz de debug
        this.updateDebugUI(vibrationLevel);
        
        // Aplicar vibración si es necesario
        if (this.isVibrating) {
            // Actualizar fase de vibración
            this.vibrationPhase += deltaSeconds * frequency * Math.PI * 2;
            
            // Generar offsets de vibración usando funciones sinusoidales con fases distintas
            // para crear un movimiento más irregular y realista
            this.vibrationOffset.x = Math.sin(this.vibrationPhase * 1.0) * intensity * 
                                     Math.sin(this.vibrationPhase * 0.3) * 0.8;
            this.vibrationOffset.y = Math.sin(this.vibrationPhase * 1.2) * intensity * 
                                     Math.cos(this.vibrationPhase * 0.5) * 0.6;
            this.vibrationOffset.z = Math.sin(this.vibrationPhase * 0.7) * intensity * 
                                     Math.sin(this.vibrationPhase * 0.9) * 0.4;
            
            // Si estamos en vibración extrema, hacer un patrón más caótico
            if (vibrationLevel === 'Extrema') {
                const chaosMultiplier = 1 + 0.5 * Math.sin(this.vibrationPhase * 3.7);
                this.vibrationOffset.multiplyScalar(chaosMultiplier);
            }
            
            // Obtener objeto de la cámara - En A-Frame, no debemos modificar los atributos position directamente
            // sino a través del objeto Three.js subyacente
            const cameraObj = this.el.object3D;
            
            // Creamos una vibración de rotación para un efecto más realista
            const rotationIntensity = intensity * 0.5; // Reducir la intensidad para la rotación
            const rotationX = Math.sin(this.vibrationPhase * 1.5) * rotationIntensity * 0.2;
            const rotationY = Math.sin(this.vibrationPhase * 0.9) * rotationIntensity * 0.1;
            const rotationZ = Math.sin(this.vibrationPhase * 2.3) * rotationIntensity * 0.15;
            
            // Aplicamos una pequeña rotación adicional
            const currentRotation = this.el.getAttribute('rotation');
            this.el.setAttribute('rotation', {
                x: currentRotation.x + THREE.MathUtils.radToDeg(rotationX),
                y: currentRotation.y + THREE.MathUtils.radToDeg(rotationY),
                z: currentRotation.z + THREE.MathUtils.radToDeg(rotationZ)
            });
            
            // Aplicar una pequeña vibración al HUD también
            if (this.hudElement) {
                const hudPos = this.hudOriginalPosition.clone();
                hudPos.x += this.vibrationOffset.x * 0.3; // Reducida para el HUD
                hudPos.y += this.vibrationOffset.y * 0.3;
                hudPos.z += this.vibrationOffset.z * 0.1;
                this.hudElement.setAttribute('position', hudPos);
            }
        } else {
            // Resetear la posición del HUD si no hay vibración
            if (this.hudElement) {
                this.hudElement.setAttribute('position', this.hudOriginalPosition);
            }
        }
    },
    
    remove: function() {
        // Limpiar interfaz de debug al eliminar componente
        if (this.debugUI && this.debugUI.parentNode) {
            this.debugUI.parentNode.removeChild(this.debugUI);
        }
    }
});