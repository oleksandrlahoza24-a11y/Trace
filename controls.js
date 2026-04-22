// A simple virtual joystick for iPad touch events
const joystick = document.createElement('div');
joystick.style = "position:absolute; bottom:50px; left:50px; width:100px; height:100px; background:rgba(255,255,255,0.2); border-radius:50%; touch-action:none;";
document.body.appendChild(joystick);

let moveX = 0, moveZ = 0;

joystick.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const rect = joystick.getBoundingClientRect();
    
    // Calculate normalized movement (-1 to 1)
    moveX = (touch.clientX - (rect.left + 50)) / 50;
    moveZ = (touch.clientY - (rect.top + 50)) / 50;
    
    // Update camera position in the main loop
    camera.position.x += moveX * 0.1;
    camera.position.z += moveZ * 0.1;
});

joystick.addEventListener('touchend', () => {
    moveX = 0; moveZ = 0;
});
