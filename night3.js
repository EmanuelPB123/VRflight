    // Esperar a que la escena cargue
    document.addEventListener('DOMContentLoaded', function() {
      const scene = document.querySelector('a-scene');
      const directionalLight = document.querySelector('#directionalLight');
      const ambientLight = document.querySelector('#ambientLight');
      
// Colores para las diferentes fases del día
const DAWN_SKY = '#ff7f32';         // Amanecer - Naranja suave
const MORNING_SKY = '#75b9e5';      // Mañana - Azul claro
const MIDDAY_SKY = '#0099ff';       // Mediodía - Azul brillante
const AFTERNOON_SKY = '#4682b4';    // Tarde - Azul acero
const SUNSET_SKY = '#f16d1a';       // Atardecer - Naranja intenso
const DUSK_SKY = '#2c3e50';         // Anochecer - Azul marino oscuro
const NIGHT_SKY = '#1a2534';        // Noche - Azul muy oscuro
const DEEP_NIGHT_SKY = '#0a0f14';   // Noche profunda - Negro azulado

      
// Colores de luz para las diferentes fases del día
const DAWN_LIGHT = '#f9cba7';       // Luz de amanecer - Dorado suave
const DAY_LIGHT = '#fff5c2';        // Luz de día - Amarillo pálido
const SUNSET_LIGHT = '#ff9f80';     // Luz de atardecer - Naranja rojizo
const NIGHT_LIGHT = '#3c3c3c';      // Luz de noche - Gris oscuro, ligeramente frío

      
      // Definir las fases del ciclo con tiempos y colores
      const cyclePhases = [
        { name: 'Dawn', skyColor: DAWN_SKY, directIntensity: 0.5, directColor: DAWN_LIGHT, ambientIntensity: 0.3, ambientColor: DAWN_LIGHT, duration: 8000 },
        { name: 'Morning', skyColor: MORNING_SKY, directIntensity: 0.8, directColor: DAY_LIGHT, ambientIntensity: 0.4, ambientColor: DAY_LIGHT, duration: 10000 },
        { name: 'Midday', skyColor: MIDDAY_SKY, directIntensity: 1.0, directColor: DAY_LIGHT, ambientIntensity: 0.5, ambientColor: DAY_LIGHT, duration: 12000 },
        { name: 'Afternoon', skyColor: AFTERNOON_SKY, directIntensity: 0.8, directColor: DAY_LIGHT, ambientIntensity: 0.4, ambientColor: DAY_LIGHT, duration: 10000 },
        { name: 'Sunset', skyColor: SUNSET_SKY, directIntensity: 0.6, directColor: SUNSET_LIGHT, ambientIntensity: 0.4, ambientColor: SUNSET_LIGHT, duration: 8000 },
        { name: 'Dusk', skyColor: DUSK_SKY, directIntensity: 0.3, directColor: SUNSET_LIGHT, ambientIntensity: 0.2, ambientColor: NIGHT_LIGHT, duration: 7000 },
        { name: 'Night', skyColor: NIGHT_SKY, directIntensity: 0.1, directColor: NIGHT_LIGHT, ambientIntensity: 0.1, ambientColor: NIGHT_LIGHT, duration: 15000 },
        { name: 'DeepNight', skyColor: DEEP_NIGHT_SKY, directIntensity: 0.05, directColor: NIGHT_LIGHT, ambientIntensity: 0.05, ambientColor: NIGHT_LIGHT, duration: 15000 }
      ];
      
      let currentPhaseIndex = 0;
      
      // Función para mover la posición de la luz según la hora del día (trayectoria del sol)
      function updateLightPosition(phaseIndex, progress) {
        const totalPhases = cyclePhases.length;
        const dayProgress = (phaseIndex + progress) / totalPhases;
        
        // Crear una trayectoria de arco para la luz direccional (simula trayectoria del sol/luna)
        const radians = Math.PI * dayProgress;
        const x = 10 * Math.cos(radians);
        const y = 8 * Math.sin(radians) + 1; // +1 para que nunca esté bajo el plano
        const z = -2;
        
        directionalLight.setAttribute('position', `${x} ${y} ${z}`);
      }
      
      // Función para transicionar entre fases
      function transitionToPhase(fromPhase, toPhase, progress) {
        // Interpolar colores y valores entre las fases
        const lerpColor = (a, b, t) => {
          // Función simple para interpolar colores hexadecimales
          const ah = parseInt(a.replace('#', ''), 16);
          const bh = parseInt(b.replace('#', ''), 16);
          const ar = (ah >> 16) & 0xff;
          const ag = (ah >> 8) & 0xff;
          const ab = ah & 0xff;
          const br = (bh >> 16) & 0xff;
          const bg = (bh >> 8) & 0xff;
          const bb = bh & 0xff;
          const rr = Math.round(ar + (br - ar) * t);
          const rg = Math.round(ag + (bg - ag) * t);
          const rb = Math.round(ab + (bb - ab) * t);
          return `#${((rr << 16) + (rg << 8) + rb).toString(16).padStart(6, '0')}`;
        };
        
        const lerpValue = (a, b, t) => a + (b - a) * t;
        
        // Calcular valores interpolados
        const skyColor = lerpColor(fromPhase.skyColor, toPhase.skyColor, progress);
        const directIntensity = lerpValue(fromPhase.directIntensity, toPhase.directIntensity, progress);
        const directColor = lerpColor(fromPhase.directColor, toPhase.directColor, progress);
        const ambientIntensity = lerpValue(fromPhase.ambientIntensity, toPhase.ambientIntensity, progress);
        const ambientColor = lerpColor(fromPhase.ambientColor, toPhase.ambientColor, progress);
        
        // Aplicar valores
        scene.setAttribute('background', {color: skyColor});
        directionalLight.setAttribute('light', {
          intensity: directIntensity,
          color: directColor
        });
        ambientLight.setAttribute('light', {
          intensity: ambientIntensity,
          color: ambientColor
        });
        
        // Actualizar posición de la luz
        updateLightPosition(currentPhaseIndex, progress);
      }
      
      // Función para iniciar ciclo continuo
      function startDayCycle() {
        const phases = cyclePhases;
        let startTime = null;
        
        function animate(timestamp) {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const currentPhase = phases[currentPhaseIndex];
          const phaseDuration = currentPhase.duration;
          
          if (elapsed < phaseDuration) {
            // Dentro de la fase actual, calculamos progreso
            const nextPhaseIndex = (currentPhaseIndex + 1) % phases.length;
            const nextPhase = phases[nextPhaseIndex];
            const progress = elapsed / phaseDuration;
            
            // Transicionar entre la fase actual y la siguiente
            transitionToPhase(currentPhase, nextPhase, progress);
            requestAnimationFrame(animate);
          } else {
            // Avanzar a la siguiente fase
            currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
            startTime = null;
            requestAnimationFrame(animate);
          }
        }
        
        requestAnimationFrame(animate);
      }
      
      // Iniciar el ciclo automáticamente cuando cargue la escena
      scene.addEventListener('loaded', function() {
        // Pequeño retraso para asegurar que todo está cargado
        setTimeout(startDayCycle, 1000);
      });
    });

    
