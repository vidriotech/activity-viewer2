// eslint-disable-next-line import/no-unresolved
import { ColorLUT } from "./models/apiModels";

export class AVConstants {
    private endpoint = 'http://localhost:3030';
    private _rootId = 997;
    private _rootColor = [135, 135, 135];

    private _defaultColor = 0x0080ff;
    private _defaultColorFaded = 0x77b4ff;
    private _defaultOpacity = 1;
    private _defaultRadius = 40;

    private _ballTexture = `data:image/png;base64,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`;
    private _circleTexture = `data:image/png;base64,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`;
    private _discTexture = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sHDgwCEMBJZu0AAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAABM5JREFUWMO1V0tPG2cUPZ4Hxh6DazIOrjFNqJs0FIMqWFgWQkatsmvVbtggKlSVRVf5AWz4AWz4AUSKEChll19QJYSXkECuhFxsHjEhxCYm+DWGMZ5HF72DJq4bAzFXurI0M/I5997v3u9cC65vTJVn2lX/xHINQOYSBLTLEuIuCWw4Z3IGAEvf6ASmVHjNzHCXBG4A0AjACsAOwEbO0nsFQBnAGYASAIl+ZRMR7SolMEdsByD09fV5R0ZGgg8ePPjW5/N1iqLYpuu6RZblciKR2I9Go69evnwZnZ+fjwI4IS8AKBIRzeQfJWCANwKwh0KhtrGxsYehUOin1tbW+zzP23ietzY2NnIAoGmaLsuyUiqVyvl8XtrY2NiamZn589mzZxsAUgCOAeQAnFI2tI+VxIjaAeDzoaGh7xYWFuZOTk6OZVk+12uYqqq6JEnn0Wg0OT4+/geAXwGEAdwDIFJQXC1wO4DWR48e/RCPxxclSSroVzRFUbSDg4P848ePFwH8DuAhkWih83TRQWxFOXgAwvDwcOfo6OhvXV1d39tsNtuVBwTDWBwOh1UUxVsMw1hXVlbSdCgNV43uYSvrHg6H24aHh38eHBz85TrgF9FYLHA4HLzH43FvbW2d7u/vG+dANp8FpqIlbd3d3V8Fg8EfBUFw4BONZVmL3+9vHhkZCQL4AoAHgJPK8G+yzC0XDofdoVAo5PP5vkadTBAEtr+/39ff3x8gAp/RPOEqx2qjx+NpvXv3bk9DQ0NDvQgwDIOWlhZrMBj8kgi0UJdxRgYMArzL5XJ7vd57qLPZ7Xamp6fnNgBXtQxcjFuHw+Hyer3t9SYgCAITCAScAJoBNNEY/08GOFVVrfVMv7kMNDntFD1vjIAPrlRN0xjckOm6biFQ3jwNPwDMZrOnqVTqfb3Bi8Wivru7W/VCYkwPlKOjo0IikXh7EwQikYgE4Nw0CfXKDCipVCoTj8df3QABbW1tLUc6oUgkFPMkVACUNjc337148eKvw8PDbJ2jP1taWkoCyNDVXDSECmNSK4qiKNLq6urW8+fPI/UicHx8rD59+jSVy+WOAKSJhKENwFItLtoxk8mwsixzHR0dHe3t7c5PAU+n09rs7OzJkydPYqVSaQfANoDXALIk31S2smU1TWMPDg7K5XKZ7+3t9TudTut1U7+wsFCcmJiIpdPpbQBxADsAknQWymYCOukBHYCuKApisdhpMpnURFEU79y503TVyKenpzOTk5M7e3t7MQKPV0Zv1gNm+awB0MvlshqLxfLb29uyJElWURSbXC4XXyvqxcXFs6mpqeTc3Nzu3t7e3wQcA7BPZ8Cov1pNlJplmQtAG8MwHV6v95tAINA5MDBwPxAIuLu6upr8fr/VAN3c3JQjkcjZ+vp6fnl5+d2bN29SuVzuNYAEpf01CdRChUL+X1VskHACuA3Ay3Fcu9vt7nA6nZ7m5uYWQRCaNE3jVVW15PP580KhIGUymWw2m00DOAJwSP4WwPtq4LX2Ao6USxNlQyS/RcQcdLGwlNIz6vEMAaZpNzCk2Pll94LK/cDYimxERiBwG10sxjgvEZBE0UpE6vxj+0Ct5bTaXthgEhRmja8QWNkkPGsuIpfdjpkK+cZUWTC0KredVmtD/gdlSl6EG4AMvQAAAABJRU5ErkJggg==`;

    private _compartmentVertexShader =  `
    varying vec3 normal_in_camera;
    varying vec3 view_direction;

    void main() {
        vec4 pos_in_camera = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * pos_in_camera;
        normal_in_camera = normalize(mat3(modelViewMatrix) * normal);
        view_direction = normalize(pos_in_camera.xyz);
    }`;
    private _compartmentFragmentShader = `
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
    }`;

    private _pointVertexShader = `
    attribute float opacity;
    attribute float size;
    attribute float visible;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vVisible;

    void main() {
        vColor = color;
        vOpacity = opacity;
        vVisible = visible;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 300.0 / -mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
    }`;
    private _pointFragmentShader = `
    uniform sampler2D pointTexture;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vVisible;

    void main() {
        gl_FragColor = vec4( vColor, vOpacity * vVisible );
        gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
    }`;

    public SagittalMax = 11400;
    public HorizontalMax = 8000;
    public CoronalMax = 13200;

    public get apiEndpoint() {
        return this.endpoint;
    }

    public get ballTexture() {
        return this._ballTexture;
    }

    public get centerPoint() {
        return [
            this.SagittalMax,
            this.HorizontalMax,
            this.CoronalMax
        ].map(x => x / 2);
    }

    public get circleTexture() {
        return this._circleTexture;
    }

    public get compartmentFragmentShader() {
        return this._compartmentFragmentShader;
    }


    public get compartmentVertexShader() {
        return this._compartmentVertexShader;
    }

    public get defaultColor() {
        return this._defaultColor;
    }

    public get defaultColorFaded() {
        return this._defaultColorFaded;
    }

    public get defaultColorLUT(): ColorLUT {
        const mapping = new Array(768);
        for (let i = 0; i < 768; i += 3) {
            mapping[i] = 0;
            mapping[i + 1] = 0.50196078;
            mapping[i + 2] = 1;
        }

        return {
            name: "default",
            mapping
        };
    }

    public get defaultOpacity() {
        return this._defaultOpacity;
    }

    public get defaultRadius() {
        return this._defaultRadius;
    }

    public get discTexture() {
        return this._discTexture;
    }

    public get pointFragmentShader() {
        return this._pointFragmentShader;
    }

    public get pointVertexShader() {
        return this._pointVertexShader;
    }

    public get rootColor() {
        return this._rootColor;
    }

    public get rootId() {
        return this._rootId;
    }
}