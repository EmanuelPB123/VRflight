// Script mejorado para simular un ciclo de día y noche en A-Frame con transiciones suaves
AFRAME.registerComponent('day-night-cycle', {
    schema: {
      // Duración del ciclo completo día-noche en milisegundos
      cycleDuration: {type: 'number', default: 60000},
      // Intensidad máxima de la luz solar (mediodía)
      sunMaxIntensity: {type: 'number', default: 1.0},
      // Intensidad mínima de la luz solar (noche)
      sunMinIntensity: {type: 'number', default: 0.1},
      // Intensidad de la luz lunar
      moonIntensity: {type: 'number', default: 0.4},
      // Distancia de los astros
      celestialDistance: {type: 'number', default: 400}
    },
    
    init: function() {
      // Crear referencias a las entidades
      this.sceneEl = document.querySelector('a-scene');
      
      // Crear el sol (esfera amarilla)
      this.sun = document.createElement('a-entity');
      this.sun.setAttribute('id', 'sun');
      this.sun.setAttribute('geometry', {
        primitive: 'sphere',
        radius: 5
      });
      this.sun.setAttribute('material', {
        shader: 'flat',
        color: '#ffff00',
        emissive: '#ff8c00',
        emissiveIntensity: 1
      });
      this.sun.setAttribute('position', {x: 100, y: 0, z: 0});
      
      // Crear la luz del sol
      this.sunLight = document.createElement('a-entity');
      this.sunLight.setAttribute('id', 'sunlight');
      this.sunLight.setAttribute('light', {
        type: 'directional',
        color: '#ffffff',
        intensity: this.data.sunMaxIntensity,
        castShadow: true
      });
      this.sunLight.setAttribute('shadow', {
        mapSize: 2048,
        bias: -0.0001
      });
      
      // Añadir la luz como hijo del sol
      this.sun.appendChild(this.sunLight);
      
      // Crear la luna (esfera grisácea)
      this.moon = document.createElement('a-entity');
      this.moon.setAttribute('id', 'moon');
      this.moon.setAttribute('geometry', {
        primitive: 'sphere',
        radius: 3
      });
      this.moon.setAttribute('material', {
        shader: 'flat',
        color: '#dddddd',
        emissive: '#aaaaaa',
        emissiveIntensity: 1
      });
      this.moon.setAttribute('position', {x: -100, y: 0, z: 0});
      
      // Crear la luz de la luna
      this.moonLight = document.createElement('a-entity');
      this.moonLight.setAttribute('id', 'moonlight');
      this.moonLight.setAttribute('light', {
        type: 'directional',
        color: '#b9d5ff',  // Luz azulada de la luna
        intensity: 0,  // Comienza apagada
        castShadow: true
      });
      this.moonLight.setAttribute('shadow', {
        mapSize: 1024,
        bias: -0.0001
      });
      
      // Añadir la luz como hijo de la luna
      this.moon.appendChild(this.moonLight);
      
      // Añadir sol y luna a la escena
      this.sceneEl.appendChild(this.sun);
      this.sceneEl.appendChild(this.moon);
      
      // Definir colores para interpolación
      this.colors = {
        sunrise: '#ff9e7a',     // Amanecer: naranja rojizo
        day: '#cfe0ff',         // Día: blanco
        sunset: '#ff7a46',      // Atardecer: naranja
        dusk: '#4c518a',        // Anochecer: púrpura azulado
        night: '#01051c'        // Noche: azul oscuro
      };
      
      // Estado actual para transiciones suaves
      this.currentState = {
        sunIntensity: 0,
        moonIntensity: 0,
        skyColor: this.colors.night
      };
      
      // Iniciar la animación
      this.startCycle();
    },
    
    startCycle: function() {
      // Tiempo de inicio
      this.startTime = Date.now();
      this.lastUpdateTime = this.startTime;
      
      // Iniciar el bucle de animación
      this.tick = AFRAME.utils.throttleTick(this.tick, 16, this); // 60fps aproximadamente
    },
    
    /**
     * Interpolación suave entre dos valores
     */
    lerp: function(start, end, factor) {
      return start + (end - start) * factor;
    },
    
    /**
     * Interpolación suave entre dos colores hexadecimales
     */
    lerpColor: function(startColor, endColor, factor) {
      // Convertir colores hex a componentes RGB
      const start = {
        r: parseInt(startColor.substr(1, 2), 16),
        g: parseInt(startColor.substr(3, 2), 16),
        b: parseInt(startColor.substr(5, 2), 16)
      };
      
      const end = {
        r: parseInt(endColor.substr(1, 2), 16),
        g: parseInt(endColor.substr(3, 2), 16),
        b: parseInt(endColor.substr(5, 2), 16)
      };
      
      // Interpolar cada componente
      const result = {
        r: Math.round(this.lerp(start.r, end.r, factor)),
        g: Math.round(this.lerp(start.g, end.g, factor)),
        b: Math.round(this.lerp(start.b, end.b, factor))
      };
      
      // Convertir de nuevo a hex
      return '#' + 
        result.r.toString(16).padStart(2, '0') +
        result.g.toString(16).padStart(2, '0') +
        result.b.toString(16).padStart(2, '0');
    },
    
    tick: function() {
      const currentTime = Date.now();
      const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // en segundos
      const elapsedTime = currentTime - this.startTime;
      
      // Factor de suavizado (ajustar para cambios más lentos o rápidos)
      const smoothFactor = Math.min(deltaTime * 1.5, 1.0);
      
      // Calcular la posición en el ciclo (0-1)
      const cyclePosition = (elapsedTime % this.data.cycleDuration) / this.data.cycleDuration;
      
      // Actualizar el cielo y las luces según la posición en el ciclo
      this.updateCelestialBodies(cyclePosition, smoothFactor);
      
      // Actualizar el tiempo de la última actualización
      this.lastUpdateTime = currentTime;
    },
    
    updateCelestialBodies: function(cyclePosition, smoothFactor) {
      // Calcular la posición angular del sol (de 0 a 2π)
      const sunAngle = cyclePosition * Math.PI * 2;
      // La luna está en el lado opuesto del ciclo
      const moonAngle = (cyclePosition + 0.5) % 1 * Math.PI * 2;
      
      const dist = this.data.celestialDistance;
      
      // Calcular la posición x, y del sol
      const sunX = Math.cos(sunAngle) * dist;
      const sunY = Math.sin(sunAngle) * dist;
      
      // Calcular la posición x, y de la luna
      const moonX = Math.cos(moonAngle) * dist;
      const moonY = Math.sin(moonAngle) * dist;
      
      // Suavizar movimiento utilizando una curva sinusoidal
      // Esto evita el movimiento lineal y lo hace más natural
      const smoothSunY = Math.max(0.1, sunY);
      const smoothMoonY = Math.max(0.1, moonY);
      
      // Verificar si el sol está por encima del horizonte
      const sunAboveHorizon = sunY > 0;
      // Verificar si la luna está por encima del horizonte
      const moonAboveHorizon = moonY > 0;
      
      // Actualizar posición del sol suavemente
      this.sun.setAttribute('position', {
        x: sunX,
        y: smoothSunY,
        z: 0
      });
      
      // Actualizar posición de la luna suavemente
      this.moon.setAttribute('position', {
        x: moonX,
        y: smoothMoonY,
        z: 0
      });
      
      // Calcular intensidades de luz objetivo
      let targetSunIntensity = 0;
      let targetMoonIntensity = 0;
      let targetSkyColor;
      
      // Normalizar la altura para cálculos (0-1)
      const normalizedSunHeight = Math.max(0, Math.min(sunY / (dist * 0.7), 1));
      const normalizedMoonHeight = Math.max(0, Math.min(moonY / (dist * 0.7), 1));
      
      // Calcular intensidad del sol utilizando una curva suave (función seno)
      if (sunAboveHorizon) {
        // Usar una curva de intensidad más natural
        targetSunIntensity = this.data.sunMinIntensity + 
                            (this.data.sunMaxIntensity - this.data.sunMinIntensity) * 
                            Math.sin(normalizedSunHeight * Math.PI/2);
      }
      
      // Calcular intensidad de la luna utilizando una curva suave
      if (moonAboveHorizon) {
        // Intensidad de la luna, más sutil
        targetMoonIntensity = this.data.moonIntensity * 
                             Math.sin(normalizedMoonHeight * Math.PI/2);
        
        // Reducir aún más si el sol está presente
        if (sunAboveHorizon) {
          targetMoonIntensity *= (1 - normalizedSunHeight);
        }
      }
      
      // Determinar el color del cielo según la fase del día/noche
      if (normalizedSunHeight > 0.8) {
        // Día pleno
        targetSkyColor = this.colors.day;
      } else if (normalizedSunHeight > 0.1) {
        // Transición entre amanecer y día o día y atardecer
        if (cyclePosition < 0.5) {
          // Amanecer -> día
          const factor = (normalizedSunHeight - 0.1) / 0.7;
          targetSkyColor = this.lerpColor(this.colors.sunrise, this.colors.day, factor);
        } else {
          // Día -> atardecer
          const factor = (normalizedSunHeight - 0.1) / 0.7;
          targetSkyColor = this.lerpColor(this.colors.sunset, this.colors.day, factor);
        }
      } else if (sunAboveHorizon) {
        // Justo en el amanecer o atardecer
        targetSkyColor = cyclePosition < 0.5 ? this.colors.sunrise : this.colors.sunset;
      } else if (normalizedMoonHeight > 0) {
        // Anochecer -> noche o noche -> amanecer
        if (cyclePosition > 0.75 || cyclePosition < 0.25) {
          // Noche profunda
          targetSkyColor = this.colors.night;
        } else {
          // Transición anochecer-noche
          const duskFactor = (normalizedMoonHeight > 0.3) ? 0 : (0.3 - normalizedMoonHeight) / 0.3;
          targetSkyColor = this.lerpColor(this.colors.night, this.colors.dusk, duskFactor);
        }
      } else {
        // Noche profunda
        targetSkyColor = this.colors.night;
      }
      
      // Aplicar suavizado a todas las propiedades
      // Interpolar la intensidad del sol actual con el objetivo
      this.currentState.sunIntensity = this.lerp(
        this.currentState.sunIntensity, 
        targetSunIntensity, 
        smoothFactor
      );
      
      // Interpolar la intensidad de la luna actual con el objetivo
      this.currentState.moonIntensity = this.lerp(
        this.currentState.moonIntensity, 
        targetMoonIntensity, 
        smoothFactor
      );
      
      // Interpolar el color del cielo actual con el objetivo
      this.currentState.skyColor = this.lerpColor(
        this.currentState.skyColor, 
        targetSkyColor, 
        smoothFactor
      );
      
      // Actualizar las luces con valores suavizados
      this.sunLight.setAttribute('light', {
        intensity: this.currentState.sunIntensity,
        color: this.currentState.skyColor !== this.colors.night ? this.currentState.skyColor : '#ffffff'
      });
      
      this.moonLight.setAttribute('light', {
        intensity: this.currentState.moonIntensity
      });
      
      // Opcional: cambiar el color del cielo (si hay un skybox)
      const sky = document.querySelector('a-sky');
      if (sky) {
        sky.setAttribute('color', this.currentState.skyColor);
      }
    }
  });