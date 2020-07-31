import { SagittalLimit, HorizontalLimit, CoronalLimit } from "./brainViewer";

export class AVConstants {
    private SagittalLimit = 11400;
    private HorizontalLimit = 8000;
    private CoronalLimit = 13200;

    private _compartmentVertexShader =  `
    #line 585
    varying vec3 normal_in_camera;
    varying vec3 view_direction;

    void main() {
        vec4 pos_in_camera = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * pos_in_camera;
        normal_in_camera = normalize(mat3(modelViewMatrix) * normal);
        view_direction = normalize(pos_in_camera.xyz);
    }`;
    private _compartmentFragmentShader = `
    #line 597
    uniform vec3 color;
    varying vec3 normal_in_camera;
    varying vec3 view_direction;

    void main() {
        // Make edges more opaque than center
        float edginess = 1.0 - abs(dot(normal_in_camera, view_direction));
        float opacity = clamp(edginess - 0.30, 0.0, 0.5);
        // Darken compartment at the very edge
        float blackness = pow(edginess, 4.0) - 0.3;
        vec3 c = mix(color, vec3(0,0,0), blackness);
        gl_FragColor = vec4(c, opacity);
    }`

    private endpoint = 'http://localhost:3030';

    public get centerPoint() {
        return [
            this.SagittalLimit / 2,
            this.HorizontalLimit / 2,
            this.CoronalLimit / 2
        ];
    }

    public get apiEndpoint() {
        return this.endpoint;
    }

    public get compartmentVertexShader() {
        return this._compartmentVertexShader;
    }

    public get compartmentFragmentShader() {
        return this._compartmentFragmentShader;
    }
}