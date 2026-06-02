import { Mat4 } from './math';

export interface ModelData {
    modelMatrix: Float32Array;
    color: number[];
    effectType: number; // 0=normal, 1=curved space, 2=perspective shrink
    isPortal: boolean;
    portalTextureView?: GPUTextureView;
}

export class Engine {
    canvas: HTMLCanvasElement;
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;
    
    pipeline!: GPURenderPipeline;
    
    vertexBuffer!: GPUBuffer;
    colorBuffer!: GPUBuffer;
    numVertices: number = 36;
    
    cameraUniformBuffer!: GPUBuffer;
    cameraBindGroup!: GPUBindGroup;

    depthTexture!: GPUTexture;
    depthTextureView!: GPUTextureView;
    defaultTextureView!: GPUTextureView;
    defaultSampler!: GPUSampler;

    modelBindGroups: Map<string, { buffer: GPUBuffer, bindGroup: GPUBindGroup, texView?: GPUTextureView }> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async init() {
        if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("No appropriate GPUAdapter found.");

        this.device = await adapter.requestDevice();
        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
        this.format = navigator.gpu.getPreferredCanvasFormat();

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'premultiplied'
        });

        // WGSL Shader
        const wgsl = `
            struct CameraUniform {
                viewProj: mat4x4<f32>,
                cameraPos: vec4<f32>, // xyz = pos
            }
            @group(0) @binding(0) var<uniform> camera: CameraUniform;

            struct ModelUniform {
                model: mat4x4<f32>,
                colorMult: vec4<f32>,
                effectType: vec4<f32>, // x: type, y: isPortal
            }
            @group(1) @binding(0) var<uniform> modelParams: ModelUniform;
            @group(1) @binding(1) var portalSampler: sampler;
            @group(1) @binding(2) var portalTexture: texture_2d<f32>;

            struct VertexInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec4<f32>,
            }

            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) color: vec4<f32>,
                @location(1) screenPos: vec4<f32>,
            }

            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                var localPos = in.position;
                
                // 2: Ames Room / Perspective warping (Applied in local geometric space so the room itself changes shape)
                if (modelParams.effectType.x > 1.5 && modelParams.effectType.x < 2.5) {
                    let warpFactor = 1.0 - localPos.x * 0.5; // Shear the object geometry heavily on X axis
                    localPos.y = localPos.y * warpFactor;
                    localPos.z = localPos.z * warpFactor;
                }

                var worldPos = modelParams.model * vec4<f32>(localPos, 1.0);

                // 1: Animal Crossing curved world style (applied to absolute world space distance!)
                if (modelParams.effectType.x > 0.5 && modelParams.effectType.x < 1.5) {
                     let d = distance(worldPos.xz, camera.cameraPos.xz);
                     worldPos.y = worldPos.y - (d * d * 0.03); // Curve downwards smoothly over distance
                }

                var clipPos = camera.viewProj * worldPos;

                out.position = clipPos;
                out.color = in.color;
                out.screenPos = clipPos;
                
                return out;
            }

            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
                if (modelParams.effectType.y > 0.5) {
                    // True screen-space Portal mapping!
                    var ndc = in.screenPos.xy / in.screenPos.w; 
                    // Convert NDC (-1 to 1) to UV (0 to 1) for the texture
                    var uv = vec2<f32>(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
                    return textureSample(portalTexture, portalSampler, uv);
                }
                return in.color * modelParams.colorMult;
            }
        `;

        const shaderModule = this.device.createShaderModule({ code: wgsl });

        this.pipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [
                    {
                        arrayStride: 3 * 4,
                        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }]
                    },
                    {
                        arrayStride: 4 * 4,
                        attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }]
                    }
                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format: this.format }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        const defaultTex = this.device.createTexture({
            size: [1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        this.device.queue.writeTexture(
            { texture: defaultTex },
            new Uint8Array([255, 255, 255, 255]),
            { bytesPerRow: 4 },
            [1, 1]
        );
        this.defaultTextureView = defaultTex.createView();
        
        this.defaultSampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        // Use more subdivisions so the curve bends beautifully!
        this.initTessellatedCube(30); 
        this.resize(this.canvas.width, this.canvas.height);
    }

    initTessellatedCube(subdivisions: number) {
        const positions: number[] = [];
        const colors: number[] = [];
        const step = 1.0 / subdivisions;
        
        const offset = 0.5;

        // face color definitions
        const faceColors = [
            [0.8, 0.2, 0.2, 1.0], // front
            [0.2, 0.8, 0.2, 1.0], // back
            [0.2, 0.2, 0.8, 1.0], // top
            [0.8, 0.8, 0.2, 1.0], // bottom
            [0.8, 0.2, 0.8, 1.0], // right
            [0.2, 0.8, 0.8, 1.0], // left
        ];

        // Generate subdivided face
        const emitFace = (xIdx: number, yIdx: number, zIdx: number, xSign: number, ySign: number, zSign: number, color: number[]) => {
            for (let i = 0; i < subdivisions; i++) {
                for (let j = 0; j < subdivisions; j++) {
                    const nx = i * step - offset;
                    const ny = j * step - offset;
                    
                    const p1 = [0,0,0], p2 = [0,0,0], p3 = [0,0,0], p4 = [0,0,0];
                    p1[xIdx] = nx; p1[yIdx] = ny; p1[zIdx] = offset * zSign;
                    p2[xIdx] = nx + step; p2[yIdx] = ny; p2[zIdx] = offset * zSign;
                    p3[xIdx] = nx; p3[yIdx] = ny + step; p3[zIdx] = offset * zSign;
                    p4[xIdx] = nx + step; p4[yIdx] = ny + step; p4[zIdx] = offset * zSign;

                    let reverse = zSign < 0; 
                    if (yIdx === 2) reverse = !reverse; 

                    if (reverse) {
                        positions.push(...p1, ...p3, ...p2);
                        positions.push(...p2, ...p3, ...p4);
                    } else {
                        positions.push(...p1, ...p2, ...p3);
                        positions.push(...p2, ...p4, ...p3);
                    }
                    colors.push(...color, ...color, ...color, ...color, ...color, ...color);
                }
            }
        };

        // Front (z=0.5)
        emitFace(0, 1, 2, 1, 1, 1, faceColors[0]);
        // Back (z=-0.5)
        emitFace(0, 1, 2, -1, 1, -1, faceColors[1]);
        // Top (y=0.5, needs x,z mapping)
        emitFace(0, 2, 1, 1, 1, 1, faceColors[2]);
        // Bottom (y=-0.5)
        emitFace(0, 2, 1, 1, -1, -1, faceColors[3]);
        // Right (x=0.5, needs z,y mapping)
        emitFace(2, 1, 0, 1, 1, 1, faceColors[4]);
        // Left (x=-0.5)
        emitFace(2, 1, 0, -1, 1, -1, faceColors[5]);

        this.vertexBuffer = this.createBuffer(new Float32Array(positions), GPUBufferUsage.VERTEX);
        this.colorBuffer = this.createBuffer(new Float32Array(colors), GPUBufferUsage.VERTEX);
        this.numVertices = positions.length / 3;

        this.cameraUniformBuffer = this.device.createBuffer({
            size: 64 + 16, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        
        this.cameraBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.cameraUniformBuffer } }]
        });
    }

    createBuffer(data: Float32Array, usage: number) {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: usage | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();
        return buffer;
    }

    createRenderTarget(width: number, height: number): { texture: GPUTexture, view: GPUTextureView } {
        const texture = this.device.createTexture({
            size: [width, height],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        return { texture, view: texture.createView() };
    }

    resize(width: number, height: number) {
        if (!this.device || width === 0 || height === 0) return;
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = this.device.createTexture({
            size: [width, height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthTextureView = this.depthTexture.createView();
    }

    renderScene(
        projMatrix: Float32Array, 
        viewMatrix: Float32Array, 
        camPos: number[], 
        models: ModelData[],
        targetView: GPUTextureView | null = null,
        isPortalPass: boolean = false
    ) {
        if (!this.device) return;

        const viewProj = Mat4.multiply(projMatrix, viewMatrix);
        
        this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, viewProj);
        const camData = new Float32Array([camPos[0], camPos[1], camPos[2], 0]);
        this.device.queue.writeBuffer(this.cameraUniformBuffer, 64, camData);

        const commandEncoder = this.device.createCommandEncoder();
        
        const finalTargetView = targetView || this.context.getCurrentTexture().createView();

        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: finalTargetView,
                clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 }, 
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: this.depthTextureView, 
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.cameraBindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setVertexBuffer(1, this.colorBuffer);

        models.forEach((box, i) => {
            // EXTREMELY IMPORTANT: If we are rendering the portal view itself, do not render the portal geometry inside itself!
            // Rendering and Sampling the same target crashes WebGPU and causes a black abyss!
            if (isPortalPass && box.isPortal) return;

            let cache = this.modelBindGroups.get(i.toString());
            let requiredTexView = box.isPortal && box.portalTextureView ? box.portalTextureView : this.defaultTextureView;

            if (!cache || cache.texView !== requiredTexView) {
                const bufferSize = 96;
                let buffer = cache ? cache.buffer : this.device.createBuffer({
                    size: Math.max(256, bufferSize), 
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                });

                const bindGroup = this.device.createBindGroup({
                    layout: this.pipeline.getBindGroupLayout(1),
                    entries: [
                        { binding: 0, resource: { buffer } },
                        { binding: 1, resource: this.defaultSampler },
                        { binding: 2, resource: requiredTexView }
                    ]
                });
                cache = { buffer, bindGroup, texView: requiredTexView };
                this.modelBindGroups.set(i.toString(), cache);
            }

            this.device.queue.writeBuffer(cache.buffer, 0, box.modelMatrix);
            this.device.queue.writeBuffer(cache.buffer, 64, new Float32Array(box.color));
            this.device.queue.writeBuffer(cache.buffer, 80, new Float32Array([box.effectType, box.isPortal ? 1.0 : 0.0, 0, 0]));

            pass.setBindGroup(1, cache.bindGroup);
            pass.draw(this.numVertices, 1, 0, 0);
        });

        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
