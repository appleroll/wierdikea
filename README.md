![wierd ikea engine banner](public/banner.png)
[![Deploy to Pages](https://github.com/appleroll/wierdikea/actions/workflows/deploy.yml/badge.svg)](https://github.com/appleroll/wierdikea/actions/workflows/deploy.yml) 
![Last Commit](https://img.shields.io/github/last-commit/appleroll/wierdikea/main
)

# Welcome to Ethan's Wierd IKEA Simulation
**[Wierd IKEA Sim is now hosted on Github Pages. Play it now!](https://appleroll.github.io/wierdikea)**<br>
**[View this project on Stardance!](https://stardance.hackclub.com/projects/3831)**  <br>
Wierd IKEA Sim, is a non-euclidean (and abstract) simulation somewhat inspired by Swedish furniture store IKEA. Built with vanilla Vite (TypeScript) and WebGPU, it utilises a custom 3D graphics engine to reconstruct a heavily simplified (and wierd) version of the furniture store based on my experiences shopping there, as well as the memes about IKEA.

This was mainly made to be a small project made so I can explore the world of graphic design, while also taking a break from my other projects. This project is also created as part of the HackClub Stardance event.<br>

## Quick Note
This project is not designed to advertise, defame, or portray IKEA in any way. You could even say that IKEA was only used as a small inspiration, and that the simulation is not meant to be even remotely similar to the real thing. If it was too realistic, it wouldn't be fun too make (too much time worrying about furniture placements and 3d modelling), and I might (though probably not) get sued or something.

## Repository Structure
For those of you curious, here's how the source code is structured.
### src/
- audio/ - Contains Audio initialisation function
- colour/ - Map for IKEA's colour scheme
- core/ - Contains the source code for the engine
- input/ - Contains input detection source code
- math/ - Contains all math functions
- noneuclideans/ - Contains source code for modular noneuclidean structures
- states/ - Contains current game states
- world/ - Contains code that builds the IKEA
### public/
- contains media files used in the game

## AI Use Regarding This Project
An effort has been made to minimise the amount of AI-generated code in this codebase. While AI is used for certain areas, major versions (eg. versions when shipped on Stardance) are guaranteed to be AI-free. Commits where AI-generated code has been present have been marked with the tag **[AI]**.


#### Optional Shopping Theme Credit 
Shining - Leon Albertson (edited), downloaded off Youtube Studio 27 Jun