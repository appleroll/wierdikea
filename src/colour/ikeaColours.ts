export const ikeaColours = {
    blue: RGBTodRGB(0, 87, 173, 1),
    yellow: RGBTodRGB(251, 218, 12, 1),

    // theoretical white, in reality its slightly greyer
    white: RGBTodRGB(250, 250, 250, 1),

    // concrete
    concrete: RGBTodRGB(200, 200, 200, 1),
};

function RGBTodRGB(r: number, g: number, b: number, a: number): [number, number, number, number] {
    // Convert RGB to our own dRGB (decimal rgb), where each channel is a float between 0 and 1
    return [r / 255, g / 255, b / 255, a];
}