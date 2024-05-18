const vertexShaderTxt = `
precision mediump float;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProjection;

attribute vec3 vertPosition;
attribute vec3 vertColor;

varying vec3 fragColor;

void main() {
    fragColor = vertColor;
    gl_Position = mProjection * mView * mWorld * vec4(vertPosition, 1.0);
}
`
const fragmentShaderTxt = `
precision mediump float;

varying vec3 fragColor;

void main() {
    gl_FragColor = vec4(fragColor, 1.0);
}
`

function randomFloatInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generateBoxVertices(scale) {
    return [
    //   X       Y       Z
        -scale,  scale, -scale, // 0
        -scale,  scale,  scale, // 1
         scale,  scale,  scale, // 2
         scale,  scale, -scale, // 3
        -scale, -scale,  scale, // 4
        -scale, -scale, -scale, // 5
         scale, -scale,  scale, // 6
         scale, -scale, -scale, // 7
    ];
}

function generateBoxData(scale, translationVector) {
    return {
        vertices: generateBoxVertices(scale),
        translationVector : translationVector
    };
}

function generateBoxes(amount) {
    let retval = [];
    for (let i = 0; i < amount; ++i) {
        retval.push(generateBoxData(randomFloatInRange(0.2, 1.0), [randomFloatInRange(-10.0, 10.0), randomFloatInRange(-10.0, 10.0), 0]));
    }
    return retval;
}

const main = function () {
    const canvas = document.getElementById('main-canvas');
    const gl = canvas.getContext('webgl');
    let canvasColor = [0.1, 0.8, 0.8];

    checkGl(gl);

    gl.clearColor(...canvasColor, 1.0);  // R,G,B, A 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderTxt);
    gl.shaderSource(fragmentShader, fragmentShaderTxt);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);

    gl.validateProgram(program);

    const boxIndices = [
        // top
        0, 1, 2,
        0, 2, 3,
        // left
        4, 1, 5,
        5, 1, 0,
        // right
        2, 6, 7,
        2, 7, 3,
        // front
        6, 2, 4,
        1, 4, 2,
        // back
        3, 7, 5,
        3, 5, 0,
        // bottom
        4, 5, 6,
        6, 5, 7,
    ];

    let colors = [
        //  R     G     B     A
         0.9,  0.9,  0.9,  1.0,
         0.1,  0.1,  0.9,  1.0,
         0.1,  0.9,  0.9,  1.0,
         0.9,  0.9,  0.1,  1.0,
         0.9,  0.1,  0.1,  1.0,
         0.1,  0.1,  0.9,  1.0,
         0.1,  0.9,  0.1,  1.0,
         0.9,  0.1,  0.1,  1.0,
    ]

    const boxVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertBuffer);

    const boxIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), gl.STATIC_DRAW);
    
    const posAttrLoc = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        posAttrLoc,
        3,
        gl.FLOAT,
        gl.FALSE,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0
    );
    
    gl.enableVertexAttribArray(posAttrLoc);
    
    const triangleColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const colorAttrLoc = gl.getAttribLocation(program, 'vertColor');
    gl.vertexAttribPointer(
        colorAttrLoc,
        4,
        gl.FLOAT,
        gl.FALSE,
        4 * Float32Array.BYTES_PER_ELEMENT,
        0
    );

    gl.enableVertexAttribArray(colorAttrLoc);

    let boxesData = generateBoxes(32);

    // render time

    gl.useProgram(program);

    const worldMatLoc = gl.getUniformLocation(program, 'mWorld');
    const viewMatLoc = gl.getUniformLocation(program, 'mView');
    const projMatLoc = gl.getUniformLocation(program, 'mProjection');

    const worldMatrix  = glMatrix.mat4.create();
    const viewMatrix  = glMatrix.mat4.create();
    glMatrix.mat4.lookAt(viewMatrix, [0,0,-16], [0,0,0], [0,1,0]); // vectors are: position of the camera, which way they are looking, which way is up
    const projectionMatrix  = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(90), canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(viewMatLoc, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(projMatLoc, gl.FALSE, projectionMatrix);
    
    const loop  = function () {
    angle = performance.now() / 1000 / 60 * 23 * Math.PI;
    
    gl.clearColor(...canvasColor, 1.0);  
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    for (let i = 0; i < boxesData.length; ++i) {
        const oneBoxData = boxesData[i];
        
        glMatrix.mat4.identity(worldMatrix);
        glMatrix.mat4.translate(worldMatrix, worldMatrix, oneBoxData.translationVector);
        glMatrix.mat4.rotate(worldMatrix, worldMatrix, angle, [1, 1, 1]);
        
        gl.uniformMatrix4fv(worldMatLoc, gl.FALSE, worldMatrix);
        
        const boxVertBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, boxVertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(oneBoxData.vertices), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            posAttrLoc,
            3,
            gl.FLOAT,
            gl.FALSE,
            3 * Float32Array.BYTES_PER_ELEMENT,
            0
        );
        
        gl.drawElements(gl.TRIANGLES, boxIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(loop);
}



    requestAnimationFrame(loop);
}

function checkGl(gl) {
    if (!gl) {console.log('WebGL not supported, use another browser');}
}

function checkShaderCompile(gl, shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('shader not compiled', gl.getShaderInfoLog(shader));
    }
}

function checkLink(gl, program) {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR linking program!', gl.getProgramInfoLog(program));
    }
}