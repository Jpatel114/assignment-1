import buildingShaderSrc from './building.vert.js';
import flatShaderSrc from './flat.vert.js';
import fragmentShaderSrc from './fragment.glsl.js';

var gl;

var layers = null

var modelMatrix;
//var projectionMatrix;
var projMatrix;
var viewMatrix;

var currRotate = 60;
var currZoom = 60;
var currProj = 'perspective';

var anglex = 360;
var angley = 360;

/*
    Vertex shader with normals
*/
class BuildingProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, buildingShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        // TODO: set attrib and uniform locations

        this.normLoc= gl.getAttribLocation(this.program, 'normal');
        this.posAttribLoc = gl.getAttribLocation(this.program, 'position');
        this.colorAttribLoc = gl.getUniformLocation(this.program, 'uColor');

        this.modelLoc = gl.getUniformLocation(this.program, 'uModel');
        this.projLoc = gl.getUniformLocation(this.program, 'uProjection');
        this.viewLoc = gl.getUniformLocation(this.program, 'uView')

    }

    use() {
        gl.useProgram(this.program);
    }
}

/*
    Vertex shader with uniform colors
*/
class FlatProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, flatShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        // TODO: set attrib and uniform locations
        this.posAttribLoc = gl.getAttribLocation(this.program, 'position');
        this.colorAttribLoc = gl.getUniformLocation(this.program, 'uColor');
        this.modelLoc = gl.getUniformLocation(this.program, 'uModel');
        this.projLoc = gl.getUniformLocation(this.program, 'uProjection');
        this.viewLoc = gl.getUniformLocation(this.program, 'uView')

    }

    use() {
        gl.useProgram(this.program);
    }
}


/*
    Collection of layers
*/
class Layers {
    constructor() {
        this.layers = {};
        this.centroid = [0,0,0];
    }

    addBuildingLayer(name, vertices, indices, normals, color){
        var layer = new BuildingLayer(vertices, indices, normals, color);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    addLayer(name, vertices, indices, color) {
        var layer = new Layer(vertices, indices, color);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    removeLayer(name) {
        delete this.layers[name];
    }

    draw() {
        for(var layer in this.layers) {
            this.layers[layer].draw(this.centroid);
        }
    }

    
    getCentroid() {
        var sum = [0,0,0];
        var numpts = 0;
        for(var layer in this.layers) {
            numpts += this.layers[layer].vertices.length/3;
            for(var i=0; i<this.layers[layer].vertices.length; i+=3) {
                var x = this.layers[layer].vertices[i];
                var y = this.layers[layer].vertices[i+1];
                var z = this.layers[layer].vertices[i+2];
    
                sum[0]+=x;
                sum[1]+=y;
                sum[2]+=z;
            }
        }
        return [sum[0]/numpts,sum[1]/numpts,sum[2]/numpts];
    }
}

/*
    Layers without normals (water, parks, surface)
*/
class Layer {
    constructor(vertices, indices, color) {
        this.vertices = vertices;
        this.indices = indices;
        this.color = color;
    }

    init() {
        // TODO: create program, set vertex and index buffers, vao
        this.flatprogramLayer = new FlatProgram();
        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));
        this.posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.colorBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.color));
        //createVAO(gl, posAttribLoc, posBuffer, normAttribLoc = null, normBuffer = null, colorAttribLoc = null, colorBuffer = null) {
        this.LayerVao = createVAO(gl, this.flatprogramLayer.posAttribLoc,this.posBuffer);
    }

    draw(centroid) {
        // TODO: use program, update model matrix, view matrix, projection matrix
        this.flatprogramLayer.use();
        updateModelMatrix(centroid);
        updateProjectionMatrix();
        updateViewMatrix(centroid);
        // TODO: set uniforms
        gl.uniform4fv(this.flatprogramLayer.colorAttribLoc, new Float32Array(this.color));
        gl.uniformMatrix4fv(this.flatprogramLayer.modelLoc, false, new Float32Array(modelMatrix));
        gl.uniformMatrix4fv(this.flatprogramLayer.viewLoc, false, new Float32Array(viewMatrix));
        gl.uniformMatrix4fv(this.flatprogramLayer.projLoc, false, new Float32Array(projMatrix));

        // TODO: bind vao, bind index buffer, draw elements
        gl.bindVertexArray(this.LayerVao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);
    }
}

/*
    Layer with normals (building)
*/
class BuildingLayer extends Layer {
    constructor(vertices, indices, normals, color) {
        super(vertices, indices, color);
        this.normals = normals;
    }

    init() {
        // TODO: create program, set vertex, normal and index buffers, vao

        // Create a Program, Flat or Building depending on if you're in Layer or Building Layer
        this.programBLayer = new BuildingProgram();

        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));
        this.normalBuffer = createBuffer(gl, gl.ARRAY_BUFFER, this.normals);
        this.posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.colorBuffer = createBuffer(gl, gl.ARRAY_BUFFER, this.color);

        // Create a Vertex Array Object, VAO
        this.LayerVao = createVAO(gl, this.programBLayer.posAttribLoc, this.positionBuffer, this.programBLayer.normLoc, this.normalBuffer);
    }

    draw(centroid) {
        // TODO: use program, update model matrix, view matrix, projection matrix
        this.programBLayer.use();

        updateModelMatrix(centroid);
        updateProjectionMatrix();
        updateViewMatrix(centroid);

        // TODO: set uniforms
        gl.uniformMatrix4fv(this.newProgram.modelLoc, false, new Float32Array(modelMatrix));
        gl.uniformMatrix4fv(this.newProgram.viewLoc, false, new Float32Array(viewMatrix));
        gl.uniformMatrix4fv(this.newProgram.projLoc, false, new Float32Array(projMatrix));

        // TODO: bind vao, bind index buffer, draw elements
        gl.bindVertexArray(this.LayerVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);


    }
}

/*
    Event handlers
*/
window.updateRotate = function() {
    currRotate = parseInt(document.querySelector("#rotate").value);
}

window.updateZoom = function() {
    currZoom = parseFloat(document.querySelector("#zoom").value);
}

window.updateProjection = function() {
    currProj = document.querySelector("#projection").value;
}

/*
    File handler
*/
window.handleFile = function(e) {
    console.log("inside handledile");
    //var file = document.querySelector('input[type="file"]');
    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            
           const parsed = JSON.parse(evt.target.result);
           
        // TODO: parse JSON
            for(var layer in parsed){
                switch (layer) {
                    // TODO: add to layers
                    // case 'buildings':
                    //     // TODO
                    //     //console.log("in building");
                    //     //layers.addBuildingLayer(layer, parsed[layer].coordinates, parsed[layer].indices,parsed[layer].normals,parsed[layer].color);
                    //     break;
                    // case 'water':
                    //     // TODO
                    //     console.log("in water");
                    //     layers.addLayer(layer, parsed[layer]["coordinates"], parsed[layer]["indices"], parsed[layer]["color"]);                    break;
                    // case 'parks':
                    //     // TODO
                    //     console.log("in parks");
                    //     layers.addLayer(layer, parsed[layer]["coordinates"], parsed[layer]["indices"], parsed[layer]["color"]);                    break;
                    // case 'surface':
                    //     // TODO
                    //     console.log("in surface");
                    //     layers.addLayer(layer, parsed[layer]["coordinates"], parsed[layer]["indices"], parsed[layer]["color"]);
                    //     break;
                    default:
                        console.log("in DEFAULT");
                        layers.addLayer(layer, parsed[layer]["coordinates"], parsed[layer]["indices"], parsed[layer]["color"]);
                        break;
                }
            }
    }catch (err) {
        if (err.code !== 'ENOENT'){
            window.alert("ERROR, file not following the specified format\n");
            throw err;
        }
    }

    }
    reader.readAsText(e.files[0]);
}

/*
    Update transformation matrices
*/
function updateModelMatrix(centroid) {
    // TODO: update model matrix  

    //from Lab3
    var scale = scaleMatrix(0.5, 0.5, 0.5);
    var rotateX = rotateXMatrix(0.01*anglex + 45.0 * Math.PI / 180.0);
    var rotateY = rotateYMatrix(0.01*angley + -45.0 * Math.PI / 180.0);
    var rotateZ = rotateZMatrix(0.01 * currRotate + 45.0 * Math.PI / 180.0);

    var position = translateMatrix(0, 0, 0);

    // Multiply together, make sure and read them in opposite order
    modelMatrix = multiplyArrayOfMatrices([
        position, // step 4
        rotateZ,
        rotateY,  // step 3
        rotateX,  // step 2
        scale     // step 1
    ]);
}

function updateProjectionMatrix() {
    // TODO: update projection matrix
    //from Lab3
    var aspect = window.innerWidth / window.innerHeight;
    projMatrix = perspectiveMatrix(45.0 * Math.PI / 180.0, aspect, 1, 40000);
    var zoom = currZoom/100;

    // projMatrix = orthographicMatrix(-aspect, aspect, -1, 1, 0, 500);
    if(currProj == "Orthographic"){
        projMatrix = orthographicMatrix(-5000*zoom, 5000*zoomTemp, -800*zoom, 800*zoom, 0, 25000);
    }
}

function updateViewMatrix(centroid){
    // TODO: update view matrix
    // TIP: use lookat function
    viewMatrix = lookAt(add(centroid, [4200* (currZoom / 100), 4200* (currZoom / 100), 4200* (currZoom / 100)]), centroid, [0, 0, 1]);
}

/*
    Main draw function (should call layers.draw)
*/
function draw() {

    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    layers.draw();

    requestAnimationFrame(draw);

}

/*
    Initialize everything
*/
function initialize() {

    var canvas = document.querySelector("#glcanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl = canvas.getContext("webgl2");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    layers = new Layers();

    window.requestAnimationFrame(draw);

}


window.onload = initialize;