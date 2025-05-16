# Sound Forge Alchemy Documentation

## Version & Document Control

| Version | Date       | Author      | Description                |
|---------|------------|-------------|----------------------------|
| 1.0.0   | 2025-05-16 | peguesj     | Initial consolidated docs  |

---

# Table of Contents
- [Sound Forge Alchemy Documentation](#sound-forge-alchemy-documentation)
  - [Version \& Document Control](#version--document-control)
- [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Architecture](#architecture)
  - [Microservices](#microservices)
  - [Containerization](#containerization)
  - [Data Flow](#data-flow)
  - [API Reference](#api-reference)
  - [Setup \& Installation](#setup--installation)
  - [Usage](#usage)
  - [Diagrams](#diagrams)
  - [Changelog](#changelog)
  - [Next Steps \& Future Enhancements](#next-steps--future-enhancements)

---

<a id="overview"></a>
## Overview

Sound Forge Alchemy is a microservices-based web application for audio source separation and analysis. It enables users to split music tracks into stems (vocals, drums, bass, other), analyze audio, and interact with a modern UI.

<details>
<summary>📊 <b>Architectural Diagram (Mermaid)</b></summary>

```mermaid
graph TD
  subgraph Frontend
    FE[Web UI]
  end
  subgraph API_Gateway
    AG[API Gateway]
  end
  subgraph Services
    SP[Spotify Service]
    DL[Download Service]
    PR[Processing Service]
    AN[Analysis Service]
    WS[WebSocket Service]
  end
  subgraph Infra
    RD[Redis]
    PG[PostgreSQL]
    SB[Supabase]
  end
  FE --> AG
  AG --> SP
  AG --> DL
  AG --> PR
  AG --> AN
  AG --> WS
  SP --> RD
  DL --> RD
  PR --> RD
  AN --> RD
  WS --> RD
  AG --> PG
  AG --> SB
```
</details>

---

<a id="architecture"></a>
## Architecture

- **Frontend**: React + TypeScript + ShadCN UI + Vite
- **Backend Microservices**: Node.js, Python, Express, spotdl, demucs, librosa, essentia
- **Infrastructure**: Redis, PostgreSQL, Supabase

<details>
<summary>🗺️ <b>Microservices Architecture (PlantUML)</b></summary>

```plantuml
@startuml
!define RECTANGLE class
RECTANGLE Frontend {
  +Web UI
}
RECTANGLE APIGateway {
  +API Gateway
}
RECTANGLE SpotifyService {
  +Spotify Service
}
RECTANGLE DownloadService {
  +Download Service
}
RECTANGLE ProcessingService {
  +Processing Service
}
RECTANGLE AnalysisService {
  +Analysis Service
}
RECTANGLE WebSocketService {
  +WebSocket Service
}
RECTANGLE Redis {}
RECTANGLE PostgreSQL {}
RECTANGLE Supabase {}
Frontend --> APIGateway
APIGateway --> SpotifyService
APIGateway --> DownloadService
APIGateway --> ProcessingService
APIGateway --> AnalysisService
APIGateway --> WebSocketService
SpotifyService --> Redis
DownloadService --> Redis
ProcessingService --> Redis
AnalysisService --> Redis
WebSocketService --> Redis
APIGateway --> PostgreSQL
APIGateway --> Supabase
@enduml
```
</details>

---

<a id="microservices"></a>
## Microservices

- **API Gateway**: Entry point, routes requests
- **Spotify Service**: Spotify API integration
- **Download Service**: Downloads tracks using spotdl
- **Processing Service**: Separates audio using demucs
- **Analysis Service**: Audio analysis (BPM, key, etc.)
- **WebSocket Service**: Real-time updates

<details>
<summary>🔄 <b>Process Flow (Mermaid)</b></summary>

```mermaid
sequenceDiagram
  participant User
  participant FE as Frontend
  participant AG as API Gateway
  participant DL as Download Service
  participant PR as Processing Service
  participant AN as Analysis Service
  participant WS as WebSocket Service
  participant RD as Redis
  User->>FE: Enter Spotify URL
  FE->>AG: /api/spotify/fetch
  AG->>DL: /api/download/track
  DL->>RD: Store job
  DL->>WS: Publish job event
  AG->>PR: /api/process/separate
  PR->>RD: Store processing job
  PR->>WS: Publish processing event
  AG->>AN: /api/analyze/analyze
  AN->>RD: Store analysis job
  AN->>WS: Publish analysis event
  WS->>FE: Real-time updates
```
</details>

---

<a id="containerization"></a>
## Containerization

- **Docker Compose** for orchestration
- **Base Images**: node-base, python-node-base, gpu-base
- **Volumes**: audio_data, models, etc.
- **Networks**: sound-forge-network

<details>
<summary>🐳 <b>Containerization Architecture (Mermaid)</b></summary>

```mermaid
graph LR
  subgraph DockerCompose
    FE[Frontend]
    AG[API Gateway]
    SP[Spotify Service]
    DL[Download Service]
    PR[Processing Service]
    AN[Analysis Service]
    WS[WebSocket Service]
    RD[Redis]
    PG[PostgreSQL]
    SB[Supabase]
  end
  FE --- AG
  AG --- SP
  AG --- DL
  AG --- PR
  AG --- AN
  AG --- WS
  AG --- PG
  AG --- SB
  SP --- RD
  DL --- RD
  PR --- RD
  AN --- RD
  WS --- RD
```
</details>

---

<a id="data-flow"></a>
## Data Flow

<details>
<summary>🔁 <b>Data Flow (PlantUML)</b></summary>

```plantuml
@startuml
actor User
participant FE as "Frontend"
participant AG as "API Gateway"
participant DL as "Download Service"
participant PR as "Processing Service"
participant AN as "Analysis Service"
participant WS as "WebSocket Service"
participant RD as Redis
User -> FE: Interact
FE -> AG: API Calls
AG -> DL: Download Track
DL -> RD: Store Download Job
DL -> WS: Publish Download Event
AG -> PR: Separate Track
PR -> RD: Store Processing Job
PR -> WS: Publish Processing Event
AG -> AN: Analyze Track
AN -> RD: Store Analysis Job
AN -> WS: Publish Analysis Event
WS -> FE: Real-time Updates
@enduml
```
</details>

---

<a id="api-reference"></a>
## API Reference

See [API Reference](#api-reference) in the root README for endpoints and usage.

---

<a id="setup--installation"></a>
## Setup & Installation

See [README.md](../README.md) for setup, prerequisites, and installation instructions.

---

<a id="usage"></a>
## Usage

See [README.md](../README.md) for usage instructions.

---

<a id="diagrams"></a>
## Diagrams

See above for embedded diagrams. For advanced diagrams, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

<a id="changelog"></a>
## Changelog

See [../CHANGELOG](../CHANGELOG) for a full list of changes.

---

<a id="next-steps--future-enhancements"></a>
## Next Steps & Future Enhancements

- Add advanced model management UI
- Enhance notification and settings UX
- Add more audio analysis features
- Improve container orchestration for cloud
- Add more diagrams and documentation
- Expand test coverage
- Add user authentication and permissions
- Integrate with more music services

---

For more details, see the [README.md](../README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
