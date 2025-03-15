AFRAME.registerComponent('volumetric-clouds', {
    schema: {
      minAltitude: { type: 'number', default: 0 }, // Altura mínima en metros
      maxAltitude: { type: 'number', default: 1000 }, // Altura máxima en metros
      layers: { type: 'number', default: 3 }, // Número de capas de nubes
      density: { type: 'number', default: 1.0 }, // Aumentada la densidad de nubes (0-1)
      windSpeed: { type: 'number', default: 0.2 }, // Velocidad del viento
      seed: { type: 'number', default: Math.random() * 10000 } // Semilla aleatoria
    },
  
    init: function() {
      this.clouds = [];
      this.cloudTypes = [
        { name: 'cirros', minAlt: 1500, maxAlt: 2500, particles: 30, size: { min: 15, max: 30 } }, // Más partículas en los Cirros
        { name: 'cumulus', minAlt: 500, maxAlt: 1500, particles: 40, size: { min: 30, max: 60 } }, // Más partículas en los Cúmulos
        { name: 'stratus', minAlt: 0, maxAlt: 500, particles: 35, size: { min: 25, max: 50 } } // Más partículas en los Estratos
      ];
  
      this.createCloudLayers();
  
      // Establecer el sistema para actualizar la visibilidad de las nubes basado en la altitud
      this.playerEl = document.querySelector('[camera]');
      if (!this.playerEl) {
        this.playerEl = document.querySelector('a-camera');
      }
    },
  
    createCloudLayers: function() {
      const data = this.data;
  
      // Crear contenedor para todas las nubes
      this.cloudContainer = document.createElement('a-entity');
      this.cloudContainer.setAttribute('id', 'cloud-container');
      this.el.appendChild(this.cloudContainer);
  
      // Crear capas de nubes
      for (let layer = 0; layer < data.layers; layer++) {
        const cloudType = this.cloudTypes[layer % this.cloudTypes.length];
        const layerAltitude = cloudType.minAlt + (Math.random() * (cloudType.maxAlt - cloudType.minAlt));
        const layerDensity = data.density * (1 - (layer * 0.2));
  
        this.createVolumetricCloudLayer(layer, layerAltitude, layerDensity, cloudType);
      }
    },
  
    createVolumetricCloudLayer: function(layerIndex, altitude, density, cloudType) {
      const data = this.data;
      const layerContainer = document.createElement('a-entity');
      layerContainer.setAttribute('id', `cloud-layer-${layerIndex}`);
      layerContainer.setAttribute('position', `0 ${altitude} 0`);
      this.cloudContainer.appendChild(layerContainer);
  
      const cloudCount = Math.floor(15 * density); // Aumentar la cantidad de nubes por capa
      const radius = 2000; // Radio de distribución de nubes
  
      for (let i = 0; i < cloudCount; i++) {
        // Posición aleatoria en un círculo
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
  
        // Crear nube volumétrica compuesta
        const cloud = this.createVolumetricCloud(cloudType, x, z);
        cloud.setAttribute('data-altitude', altitude);
        cloud.setAttribute('data-layer', layerIndex);
        cloud.setAttribute('data-type', cloudType.name);
  
        // Añadir animación de movimiento
        const speedVariation = data.windSpeed * (0.8 + Math.random() * 0.4);
        cloud.setAttribute('animation', `property: position; dir: alternate; dur: ${30000 / speedVariation}; easing: linear; loop: true; to: ${x + 300} 0 ${z + 300}`);
  
        // Guardar datos de la nube para el sistema de visibilidad
        this.clouds.push({
          element: cloud,
          altitude: altitude,
          layerIndex: layerIndex,
          type: cloudType.name
        });
  
        layerContainer.appendChild(cloud);
      }
    },
  
    createVolumetricCloud: function(cloudType, x, z) {
      // Crear entidad contenedora de la nube
      const cloud = document.createElement('a-entity');
      cloud.setAttribute('position', `${x} 0 ${z}`);
  
      // Determinar tamaño base de la nube
      const baseSize = cloudType.size.min + Math.random() * (cloudType.size.max - cloudType.size.min);
      const cloudWidth = baseSize * (0.8 + Math.random() * 0.4);
      const cloudHeight = baseSize * (0.5 + Math.random() * 0.3);
      const cloudDepth = baseSize * (0.8 + Math.random() * 0.4);
  
      // Crear volumen de la nube con múltiples esferas
      const particleCount = cloudType.particles;
  
      for (let p = 0; p < particleCount; p++) {
        const particle = document.createElement('a-entity');
  
        // Posición aleatoria dentro del volumen de la nube
        const px = (Math.random() - 0.5) * cloudWidth;
        const py = (Math.random() - 0.5) * cloudHeight;
        const pz = (Math.random() - 0.5) * cloudDepth;
  
        // Tamaño de partícula variable según posición (más grandes en el centro)
        const distFromCenter = Math.sqrt(px * px + py * py + pz * pz) / (Math.max(cloudWidth, cloudHeight, cloudDepth) / 2);
        const sizeMultiplier = 1 - Math.min(distFromCenter * 0.8, 0.8);
        const particleSize = baseSize * 0.3 * sizeMultiplier * (0.5 + Math.random() * 0.5);
  
        // Opacidad basada en la posición (más opaco en el centro)
        const opacity = Math.max(0.2, 0.9 - distFromCenter) * (0.7 + Math.random() * 0.3);
  
        // Crear esfera para la partícula de nube
        particle.setAttribute('geometry', 'primitive: sphere; radius: ' + particleSize);
        particle.setAttribute('material', 'shader: standard; color: white; opacity: ' + opacity + '; transparent: true; roughness: 1.0; metalness: 0.0;');
        particle.setAttribute('position', px + ' ' + py + ' ' + pz);
  
        cloud.appendChild(particle);
      }
  
      return cloud;
    },
  
    tick: function() {
      if (!this.playerEl) return;
  
      // Obtener altitud actual
      const playerAltitude = this.playerEl.object3D.position.y;
  
      // Actualizar visibilidad de las nubes
      this.clouds.forEach(cloud => {
        const cloudDistance = Math.abs(cloud.altitude - playerAltitude);
        const visibilityThreshold = 500; // Distancia en metros para la visibilidad
  
        // Hacer visibles/invisibles basado en la distancia
        if (cloudDistance < visibilityThreshold) {
          if (!cloud.element.getAttribute('visible')) {
            cloud.element.setAttribute('visible', true);
          }
        } else {
          if (cloud.element.getAttribute('visible')) {
            cloud.element.setAttribute('visible', false);
          }
        }
      });
    }
  });
  
  // Sistema de optimización por nivel de detalle (LOD)
  AFRAME.registerSystem('cloud-lod', {
    init: function() {
      this.camera = document.querySelector('[camera]').object3D;
      this.clouds = [];
    },
  
    registerCloud: function(cloudEntity) {
      this.clouds.push(cloudEntity);
    },
  
    tick: function() {
      if (!this.camera) return;
  
      const cameraPosition = this.camera.position;
  
      this.clouds.forEach(cloud => {
        const cloudPos = cloud.object3D.position;
        const distance = cameraPosition.distanceTo(cloudPos);
  
        // Ajustar nivel de detalle basado en la distancia
        if (distance < 500) {
          // Alta calidad - mostrar todas las partículas
          Array.from(cloud.children).forEach(particle => {
            particle.setAttribute('visible', true);
          });
        } else if (distance < 1500) {
          // Media calidad - mostrar 60% de las partículas
          Array.from(cloud.children).forEach((particle, index) => {
            particle.setAttribute('visible', index % 2.5 === 0);
          });
        } else {
          // Baja calidad - mostrar 30% de las partículas
          Array.from(cloud.children).forEach((particle, index) => {
            particle.setAttribute('visible', index % 3 === 0);
          });
        }
      });
    }
  });
  
  // Ejemplo de HTML para usar el componente
  // <a-scene cloud-lod>
  //   <a-entity volumetric-clouds="minAltitude: 0; maxAltitude: 3000; layers: 3; density: 1.0"></a-entity>
  //   
  //   <a-sky color="#87CEEB"></a-sky>
  //   <a-camera position="0 0 0"></a-camera>
  // </a-scene>
  