import { TexShape, Shape, Mesh } from './shaders.js';
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
in vec4 vColor;

uniform mat4 viewMat;
uniform mat4 projMat;

out vec4 fColor;

void main() {
	fColor = vColor;
	gl_Position = projMat * viewMat * pos;
}
`;

const fMeshShader = `#version 300 es
precision highp float;

in vec4 fColor;
out vec4 color;

void main() {
	color = fColor;
	//color = vec4(1, 0.25, 0.75, 1);
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

// ----------------------------------- WEBGL PROGRAM --------------------------

const { mat2, mat3, mat4, vec2, vec3, vec4 } = glMatrix;

const main = () => {
	const canvas = document.getElementById('gl-canvas');
	const gl = canvas.getContext('webgl2');

	if (gl === null) return;

	// supposedly improves performance (if I can get it to work -_-)
	//glMatrix.setMatrixArrayType(Array);

	// DISPLAY CONFIG
	// TODO: canvas resize: https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // map (-1,1)->(0, pixel width)
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	// matrices

	const points = [
		0,0,
		0,0.5,
		0.5,0
	];

	const sqPts = new Float32Array([
		0,0,
		0,-0.5,
		-0.5,-0.5,
		0,0,
		-0.5,0,
		-0.5,-0.5
	]);

	const texPts = [
		0,-0.5,
		0,0.0,
		-0.5,0,
		-0.5,-0.5
	];

	const shapes = [
		//new Shape(gl, vShaderSource, fShaderSource, points), // triangle
		//new Shape(gl, vShaderSource, fShaderSource, sqPts) // square
	];

	const texShapes = [
		//new TexShape(gl, vTexShader, fTexShader, sqPts, texPts, './baka.png', 0) // square
	];

	const meshes = [
		new Mesh(gl, vMeshShader, fMeshShader, './objs/cone.obj')
	];

	// TODO: flatten shapes into single array for one draw call
	shapes.forEach(shape => {
		shape.render(gl);
		gl.drawArrays(gl.TRIANGLES, 0, shape.nVerts);
	});

	texShapes.forEach(shape => {
		//gl.bindBuffer(gl.ARRAY_BUFFER, shape.posBuf);

		gl.bindVertexArray(shape.vao);
		gl.enableVertexAttribArray(shape.vao);
		//gl.bindBuffer(gl.ARRAY_BUFFER, shape.posBuf);
		shape.render(gl);
		gl.drawArrays(gl.TRIANGLES, 0, shape.nVerts);
		//gl.drawElements(gl.TRIANGLES, shape.nVerts, gl.UNSIGNED_SHORT, 0);
	});

	// TODO: this has to be called after obj loads
	//meshes.forEach((mesh) => mesh.render(gl));
	
	// TODO: drawArrays vs drawElements
}

window.onload = main;
