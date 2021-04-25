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


class TexShape extends Shape {
	constructor(gl, vShader, fShader, verts, texCoords, imgSrc, texIdx) {
		super(gl, vShader, fShader, verts);
		this.texIdx = texIdx;

		// TODO: is verts correct?
		this.texture = new Texture(gl, this.program, imgSrc, texCoords);

		// TODO: move into texture class
		this.texCoordAttribLoc = gl.getAttribLocation(this.program, 'texCoord');
		this.texSampler = gl.getUniformLocation(this.program, 'img');
		this.resLoc = gl.getUniformLocation(this.program, 'resolution');
	}

	render(gl) {
		super.render(gl);
		// TODO: can do this once and not in render?	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texture.texCoordBuf);
		gl.vertexAttribPointer(this.texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texCoordAttribLoc);

		gl.activeTexture(gl.TEXTURE0 + this.texIdx);
		gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
		gl.uniform1i(this.texSampler, this.texIdx);
	}
}

class Texture {
	// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
	constructor(gl, program, imgSrc, texCoords, texIdx=0, texCoordLocName='texCoord', texSamplerName='img', resLocName='res') {
		// TODO: pointers

		this.loadTexture(gl, imgSrc);
		this.initBuffers(gl, texCoords);
	}

	initBuffers(gl, texCoords) {
		// TODO: Tex coords not obj coords
		this.texCoordBuf = gl.createBuffer();
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}

	loadTexture(gl, imgSrc) {
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

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

		const image = new Image(); image.onload = () => { gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				srcFormat, srcType, image);

			// image width and height must be power of 2
			// 	clamp if it is not
			if (this.isPowOfTwo(image.width) && this.isPowOfTwo(image.height)) {
				gl.generateMipMap(gl.TEXTURE_2D);
			} else {
				// handles how arr pointer reads
				//   wrap around or not/stop in spot
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}
		};
		image.src = imgSrc;
	}

	isPowOfTwo(n) {
		return (n & (n-1)) === 0;
	}
}


class Mesh {
	// TODO: aspect ratio
	static projMat = perspective(90, 4/3, 0.01, 100);

	constructor(gl, vShaderSource, fShaderSource, meshSrc) {
		// create program
		this.program = createProgram(gl,
			createShader(gl, gl.VERTEX_SHADER, vShaderSource), // vertex shader
			createShader(gl, gl.FRAGMENT_SHADER, fShaderSource)); // fragment shader

		this.viewMatPtr = gl.getUniformLocation(this.program, 'viewMat');
		//this.viewMat = viewMat;
		this.projMatPtr = gl.getUniformLocation(this.program, 'projMat');

		const cb = () => this.initBuffers(gl, this.verts, this.indices);
		// bind this needed since func loses this when being passed as first order
		// https://eliux.github.io/javascript/common-errors/why-this-gets-undefined-inside-methods-in-javascript/
		loadOBJFromPath(meshSrc, this.loadedMesh.bind(this), cb.bind(this));
	}
	
	initBuffers(gl, vertArr, idxArr) {
		gl.useProgram(this.program);

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
		gl.uniformMatrix4fv(this.projMatPtr, false, flatten(Mesh.projMat));
		this.render(gl);
	}

	render(gl) {
		gl.useProgram(this.program);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
		gl.vertexAttribPointer(this.vertPointer,
			3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.vertPointer);

		this.viewMat = lookAt(vec3(-2,0,0), vec3(1,0,0), vec3(0,0,1));
		gl.uniformMatrix4fv(this.viewMatPtr, false, flatten(this.viewMat));

		// TODO: move all assets into one list and use offsets
		gl.drawElements(gl.TRIANGLES, this.nVerts, gl.UNSIGNED_SHORT, 0);
		// TODO: put render here again?
	}

	loadedMesh(data, _cb) {
		this.mesh = loadOBJFromBuffer(data);
		this.indices = this.mesh.i_verts;
		this.verts = this.mesh.c_verts;
		// TODO: normals
		this.texCoords = this.getOrderedTextureCoordsFromObj(this.mesh);
		this.nVerts = this.indices.length;
		_cb();
	}

	getOrderedTextureCoordsFromObj(obj_object) {
		const tex_idx = obj_object.i_uvt;
		const obj_idx = obj_object.i_verts;
		const tex_coords = obj_object.c_uvt;
	
		const arr_len = 2 * obj_object.c_verts.length;
		this.texCoordsOrderedWithVertices = new Float32Array(arr_len);
	
		for (let i=0; i<arr_len; i++) {
			this.texCoordsOrderedWithVertices[2*obj_idx[i]] = tex_coords[2*tex_idx[i]];
			this.texCoordsOrderedWithVertices[2*obj_idx[i]+1] = tex_coords[2*tex_idx[i]+1];
		}
	}	
}


class TexMesh extends Mesh {
	constructor(gl, vShaderSource, fShaderSource, meshSrc, texCoords, imgSrc) {
		super(gl, vShaderSource, fShaderSource, meshSrc);
		this.img = new Image();
		this.img.src = imgSrc;
		this.img.onload = () => {

		}
	}
}


export { TexShape, Shape, Mesh };
