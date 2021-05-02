const createShader = (gl, type, source) => {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
	
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			// COMPILE SUCCESSFUL
			return shader;
		}
	
		console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}
	
const createProgram = (gl, vShader, fShader) => {
		const program = gl.createProgram();
		gl.attachShader(program, vShader);
		gl.attachShader(program, fShader);
		gl.linkProgram(program);
	
		if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
			// LINK SUCCESSFUL
			return program;
		}
	
		console.error('Error creating program:', gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
	}


class Shape {
	constructor(gl, vShaderSource, fShaderSource, vertices) {
		// create program
		this.program = createProgram(gl,
			createShader(gl, gl.VERTEX_SHADER, vShaderSource), // vertex shader
			createShader(gl, gl.FRAGMENT_SHADER, fShaderSource)); // fragment shader

		// TODO: divide by num dimensions, not just 2
		// TODO: needed for drawElements?
		this.nVerts = parseInt(vertices.length/2); // needed for drawArray 

		this.initBuffers(gl, vertices);
	}

	render(gl) {
		gl.useProgram(this.program);

		// TODO: take in as obj?
		const size = 2, // 2d points
			type = gl.FLOAT, // 32bit
			normalize = false,
			stride = 0,
			offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
		// TODO: this right?
		gl.vertexAttribPointer(this.posPointer, size, type, normalize, stride, offset);
		gl.enableVertexAttribArray(this.posPointer);
	}

	initBuffers(gl, posArr, idxArr=[]) {
		this.posPointer = gl.getAttribLocation(this.program, 'pos'); // TODO: always take pos?
		this.posBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posArr), gl.STATIC_DRAW);

		// TODO: remove this???
		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);
		gl.enableVertexAttribArray(this.posPointer);
	}
}


class Texture {
	// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
	constructor(gl, program, imgSrc, texCoords, renderFunc, texIdx=0, texCoordLocName='texCoord', texSamplerName='u_sampler') {
		this.program = program;
		this.texCoordPtr   = gl.getAttribLocation(program, texCoordLocName);
		this.texSamplerPtr = gl.getUniformLocation(program, texSamplerName);

		console.log(texCoords);
		this.initBuffers(gl, texCoords);
		this.loadTexture(gl, imgSrc, renderFunc);
	}

	initBuffers(gl, texCoords) {
		// TODO: Tex coords not obj coords
		this.texCoordBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuf);
		console.log(texCoords);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}

	loadTexture(gl, imgSrc, renderFunc) {
		//gl.useProgram(this.program);
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.texSamplerPtr, 0); // TODO: texIdx
		gl.activeTexture(gl.TEXTURE0); // TODO: texIdx

		// preload blue into texture while img loads
		const level = 0,
			internalFormat = gl.RGBA,
			width = 1,
			height = 1,
			border = 0,
			srcFormat = gl.RGBA,
			srcType = gl.UNSIGNED_BYTE,
			pixel = new Uint8Array([0, 0, 255, 255]); // solid blue pxl
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
			width, height, border, srcFormat, srcType, pixel);

		const image = new Image();
		image.src = imgSrc;
		image.onload = () => { 
			console.log('img loaded');
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); //?
			gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				srcFormat, srcType, image);

			// image width and height must be power of 2
			// 	clamp if it is not
			if (this.isPowOfTwo(image.width) && this.isPowOfTwo(image.height)) {
				gl.generateMipmap(gl.TEXTURE_2D);
			} else {
				// handles how arr pointer reads
				//   wrap around or not/stop in spot
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}
			renderFunc(gl);
		};
	}

	render(gl, texIdx) {
		//gl.useProgram(this.program);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuf);
		gl.enableVertexAttribArray(this.texCoordPtr);
		gl.vertexAttribPointer(this.texCoordPtr, 2, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE0 + texIdx);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.texSamplerPtr, texIdx);
	}

	isPowOfTwo(n) {
		return (n & (n-1)) === 0;
	}
}


class Mesh {
	// TODO: aspect ratio
	static projMat = perspective(90, 4/3, 0.01, 100);


	constructor(gl, vShaderSource, fShaderSource, meshObj) {
		// create program
		this.program = createProgram(gl,
			createShader(gl, gl.VERTEX_SHADER, vShaderSource), // vertex shader
			createShader(gl, gl.FRAGMENT_SHADER, fShaderSource)); // fragment shader

		gl.useProgram(this.program);
		const mesh = loadOBJFromBuffer(meshObj);
		this.verts   = mesh.c_verts;
		this.indices = mesh.i_verts;
		this.texCoords = this.getOrderedTextureCoordsFromObj(mesh);
		this.nVerts  = this.indices.length;
		// TODO: normals
		this.modelMat = mat4();

		this.modelMatPtr = gl.getUniformLocation(this.program, 'modelMat');
		this.viewMatPtr = gl.getUniformLocation(this.program, 'viewMat');
		this.projMatPtr = gl.getUniformLocation(this.program, 'projMat');

		this.initBuffers(gl, this.verts, this.indices);
		// bind this needed since func loses this when being passed as first order
		// https://eliux.github.io/javascript/common-errors/why-this-gets-undefined-inside-methods-in-javascript/
	}

	initBuffers(gl, vertArr, idxArr) {
		//gl.useProgram(this.program);

		// index buffers
		this.idxBuf = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idxArr), gl.STATIC_DRAW);

		// vertex buffer
		this.vertBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertArr), gl.STATIC_DRAW);
		this.vertPointer = gl.getAttribLocation(this.program, 'pos'); // TODO: always take pos?

		// normal buffer
		//this.normPtr = gl.getAttribLocation(this.program, 'vNorm');
		//gl.vertexAttribPointer(this.normPtr, 4, gl.FLOAT, false, 0, 0);
		//gl.enableVertexAttribArray(this.normPtr);
		//this.nBuf = gl.createBuffer();
		//gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
		//gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normArr), gl.STATIC_DRAW);

		// TODO: can this be here?

		gl.uniformMatrix4fv(this.modelMatPtr, false, flatten(this.modelMat));
		gl.uniformMatrix4fv(this.projMatPtr, false, flatten(Mesh.projMat));
	}

	//render(gl) {
		////gl.useProgram(this.program);
		//gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
		//gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
		//gl.vertexAttribPointer(this.vertPointer,
			//3, gl.FLOAT, false, 0, 0);
		//gl.enableVertexAttribArray(this.vertPointer);
//
		//this.viewMat = lookAt(vec3(-2,0,0), vec3(1,0,0), vec3(0,0,1));
		//gl.uniformMatrix4fv(this.viewMatPtr, false, flatten(this.viewMat));
//
		//// TODO: move all assets into one list and use offsets
		//gl.drawElements(gl.TRIANGLES, this.nVerts, gl.UNSIGNED_SHORT, 0);
	//}
	rotateObj(gl, angle, vec){
		this.modelMat = mult(this.modelMat, rotate(angle, vec));
		gl.uniformMatrix4fv(this.modelMatPtr, false, flatten(this.modelMat));
	}

	translateObj(gl, vec){
		this.modelMat = mult(this.modelMat, translate(vec[0], vec[1], vec[2]));
		gl.uniformMatrix4fv(this.modelMatPtr, false, flatten(this.modelMat));
	}
	getOrderedTextureCoordsFromObj(obj_object) {
		const tex_idx = obj_object.i_uvt;
		const obj_idx = obj_object.i_verts;
		const tex_coords = obj_object.c_uvt;
	
		const arr_len = obj_object.c_verts.length * 2;//Math.floor(2/3 * obj_object.c_verts.length);
		const texCoords = new Float32Array(arr_len);
	
		for (let i=0; i<arr_len; i++) {
			texCoords[2*obj_idx[i]] = tex_coords[2*tex_idx[i]];
			texCoords[2*obj_idx[i]+1] = tex_coords[2*tex_idx[i]+1];
		}

		return texCoords;
	}	
}


class TexMesh extends Mesh {
	constructor(gl, vShaderSource, fShaderSource, meshData, imgSrc, viewMat, texIdx) {
		super(gl, vShaderSource, fShaderSource, meshData);
		this.tex = new Texture(gl, this.program, imgSrc, this.texCoords, this.render.bind(this), texIdx);
		this.texIdx = texIdx;
		this.viewMat = viewMat;
	}

	render(gl) {
		//gl.useProgram(this.program);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
		gl.vertexAttribPointer(this.vertPointer,
			3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.vertPointer);
		
		gl.uniformMatrix4fv(this.viewMatPtr, false, flatten(this.viewMat));

		// TEXTURE RENDERING
		this.tex.render(gl, this.texIdx);

		// TODO: move all assets into one list and use offsets
		gl.drawElements(gl.TRIANGLES, this.nVerts, gl.UNSIGNED_SHORT, 0);
	}
}


export { Shape, Mesh, TexMesh };
