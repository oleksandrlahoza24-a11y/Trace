// --- VERTEX SHADER (sim.vert) ---
varying vec2 vUv;
varying float vHeight;
uniform float uTime;

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Simple wave simulation for the ocean
    if(pos.y < 0.1) {
        float wave = sin(pos.x * 0.5 + uTime) * cos(pos.z * 0.5 + uTime) * 0.2;
        pos.y += wave;
    }
    
    vHeight = pos.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// --- FRAGMENT SHADER (render.frag) ---
varying vec2 vUv;
varying float vHeight;
uniform float uTime;

void main() {
    vec3 waterColor = vec3(0.0, 0.3, 0.5);
    vec3 sandColor = vec3(0.8, 0.7, 0.4);
    vec3 grassColor = vec3(0.2, 0.5, 0.1);
    
    vec3 finalColor;
    
    // Logic to color island based on height (vHeight)
    if(vHeight < 0.2) {
        finalColor = mix(waterColor, sandColor, smoothstep(0.0, 0.2, vHeight));
    } else {
        finalColor = mix(sandColor, grassColor, smoothstep(0.2, 0.8, vHeight));
    }
    
    // Add a simple moving shimmer to the "frag"
    float shimmer = sin(vUv.x * 20.0 + uTime) * 0.05;
    gl_FragColor = vec4(finalColor + shimmer, 1.0);
}
