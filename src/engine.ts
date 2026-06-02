import { Mat4 } from './math';

export class Engine {
    canvas: HTMLCanvasElement;
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;
    pipeline!: GPURenderPipeline;
    
    vertexBuffer!: GPUBuffer;
    colorBuffer!: GPUBuffer;
    
    cameraUniformBuffer!: GPUBuffer;
    cameraBindGroup!: GPUBindGroup;

    depthTexture!: GPUTexture;
    depthTextureView!: GPUTextureView;

    modelBindGroups: Map<string, { buffer: GPUBuffer, bindGroup: GPUBindGroup }> = new Map();

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

        const wgsl = `
            struct CameraUniform {
                viewProj: mat4x4<f32>,
            }
            @group(0) @binding(0) var<uniform> camera: CameraUniform;

            struct ModelUniform {
                model: mat4x4<f32>,
                colorMult: vec4<f32>,
            }
            @group(1) @binding(0) var<uniform> modelParams: ModelUniform;

            struct VertexInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec4<f32>,
            }

            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) color: vec4<f32>,
            }

            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                out.position = camera.viewProj * modelParams.model * vec4<f32>(in.position, 1.0);
                out.color = in.color;
                return out;
            }

            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
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

        this.initBuffers();
        this.resize(this.canvas.width, this.canvas.height);
    }

    initBuffers() {
        const positions = new Float32Array([
            // Front
            -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
            -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
            // Back
            -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
            -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
            // Top
            -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
            // Bottom
            -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,
            -0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
            // Right
             0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
             0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
            // Left
            -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
            -0.5, -0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
        ]);

        const faceColors = [
            [0.8, 0.2, 0.2, 1.0], // front
            [0.2, 0.8, 0.2, 1.0], // back
            [0.2, 0.2, 0.8, 1.0], // top
            [0.8, 0.8, 0.2, 1.0], // bottom
            [0.8, 0.2, 0.8, 1.0], // right
            [0.2, 0.8, 0.8, 1.0], // left
        ];
        const colors = new Float32Array(36 * 4);
        for (let j = 0; j < 6; j++) {
            for (let i = 0; i < 6; i++) {
                colors.set(faceColors[j], (j * 6 + i) * 4);
            }
        }

        this.vertexBuffer = this.createBuffer(positions, GPUBufferUsage.VERTEX);
        this.colorBuffer = this.createBuffer(colors, GPUBufferUsage.VERTEX);

        this.cameraUniformBuffer = this.device.createBuffer({
            size: 64, // 16 floats * 4 bytes
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

    render(projMatrix: Float32Array, viewMatrix: Float32Array, models: {model: Float32Array, mult: number[]}[]) {
        if (!this.device) return;

        const viewProj = Mat4.multiply(projMatrix, viewMatrix);
        this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, viewProj);

        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.5, g: 0.7, b: 1.0, a: 1.0 },
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
            let cache = this.modelBindGroups.get(i.toString());
            if (!cache) {
                const buffer = this.device.createBuffer({
                    // Must be larger than 80 to fit Mat4 (64) + vec4 (16)
                    size: 80,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                });
                const bindGroup = this.device.createBindGroup({
                    layout: this.pipeline.getBindGroupLayout(1),
                    entries: [{ binding: 0, resource: { buffer } }]
                });
                cache = { buffer, bindGroup };
                this.modelBindGroups.set(i.toString(), cache);
            }

            this.device.queue.writeBuffer(cache.buffer, 0, box.model);
            this.device.queue.writeBuffer(cache.buffer, 64, new Float32Array(box.mult));

            pass.setBindGroup(1, cache.bindGroup);
            pass.draw(36, 1, 0, 0);
        });

        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
