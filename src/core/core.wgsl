struct CameraUniform { viewProj: mat4x4<f32> }
@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct ModelUniform {
    model: mat4x4<f32>,
    colorMult: vec4<f32>,
    portalData: vec4<f32>, // x = isPortal flag
}
@group(1) @binding(0) var<uniform> modelParams: ModelUniform;

// The texture we render the other dimension onto
@group(2) @binding(0) var portalTex: texture_2d<f32>;

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
    // If it's a portal, sample the offscreen texture using screen pixels
    if (modelParams.portalData.x > 0.5) {
        return textureLoad(portalTex, vec2<i32>(in.position.xy), 0);
    }
    return in.color * modelParams.colorMult;
}