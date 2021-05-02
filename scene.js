import { Shape, Mesh, TexMesh } from './shaders.js';
// https://webgl2fundamentals.org/webgl/lessons/webgl-fundamentals.html
// ------------------------------------ SHADERS -------------------------------

const vShaderSource = `#version 300 es
in vec4 pos;

void main() {
	gl_Position = pos;
}
`;

const vMeshShader = `#version 300 es

in vec4 pos;
in vec2 texCoord;

uniform mat4 viewMat;
uniform mat4 projMat;
uniform mat4 modelMat;

out vec2 vTexPos;

void main() {
	gl_Position = projMat * viewMat * modelMat * pos;
	vTexPos = texCoord;
}
`;

const fMeshShader = `#version 300 es
precision highp float;
in vec2 vTexPos;

uniform sampler2D u_sampler;

out vec4 col;

void main() {
	//col = vec4(vTexPos, 0, 1);
	col = texture(u_sampler, vTexPos);
}
`;

const vTexShader = `#version 300 es
in vec2 texCoord;
in vec2 pos;

uniform vec2 resolution;

out vec2 texUV;

void main() {
	gl_Position = vec4(pos, 0, 0);
	texUV = texCoord;
}
`;

const fShaderSource = `#version 300 es
precision highp float;

out vec4 color;

void main() {
	color = vec4(1, 0.25, 0.75, 1);
}
`;

const fTexShader = `#version 300 es
precision highp float;

uniform sampler2D img;

in vec2 texUV;

out vec4 col;

void main() {
	col = texture(img, texUV);
}
`;

// ----------------------------------- MESHES ---------------------------------

const loadMeshes = () => {
	meshes
	// this is the way
}

// ----------------------------------- WEBGL PROGRAM --------------------------

let viewMat;

const camControls = () => {
	// TODO: use keyboard to move camera and rotate
	viewMat = lookAt(vec3(2,5,0), vec3(0,0,0), vec3(0,1,0));
}

const main = () => {
	const canvas = document.getElementById('gl-canvas');
	const gl = canvas.getContext('webgl2');

	if (gl === null) return;

	// DISPLAY CONFIG
	// TODO: canvas resize: https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // map (-1,1)->(0, pixel width)
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	viewMat = lookAt(vec3(40,50,0), vec3(0,0,0), vec3(0,1,0));
	const meshes = [];

	const loadMeshObj = (meshObj, texSrc) => {
		// TODO: texIdx
		meshes.push(new TexMesh(gl, vMeshShader, fMeshShader, meshObj, texSrc, viewMat, 0));
		meshes[0].rotateObj(gl,90,[0,1,0])
		meshes[0].translateObj(gl, [0, 0, 20])
		requestAnimFrame(render)
	}
	function render(){
		meshes.forEach(mesh => mesh.render(gl));
	}
	const loadKeyboard = () => {
		loadOBJFromPath('./objs/keyboard/logitech/lowprofilemechanicalkeyboard.obj', loadMeshObj, './world.png') // last one calls draw
	}
		
	loadKeyboard();
}

window.onload = main;
