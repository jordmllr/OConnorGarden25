# O'Connor Garden Guide - Refactored Architecture

## Core Design Principles

- **Offline-First**: Design for offline use with seamless online synchronization
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with JS
- **Separation of Concerns**: Clear boundaries between data, UI, and business logic
- **Modular Components**: Self-contained, reusable components with clear interfaces
- **Minimal Dependencies**: Reduce external dependencies to improve performance and security

## Architecture Overview

```
+------------------+
|                  |
|  Service Worker  |
|                  |
+------------------+
         |
         v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Core App Shell  |<--->|  Data Services   |<--->|  Firebase Cloud  |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
         |                      ^
         v                      |
+------------------+            |
|                  |            |
|  Feature Modules |------------+
|                  |
+------------------+
```

## 1. Core Infrastructure

### 1.1 Service Worker Layer
- **Purpose**: Enables offline functionality and performance optimization
- **Implementation**: `sw.js`
- **Responsibilities**:
  - Strategic caching of app shell, assets, and API responses
  - Background sync for offline data changes
  - Push notification handling
  - Network request interception and fallback strategies

### 1.2 App Shell
- **Purpose**: Provides immediate UI rendering and navigation framework
- **Implementation**: `index.html`, `shell.js`, `shell.css`
- **Responsibilities**:
  - Minimal, fast-loading UI framework
  - Navigation and routing
  - Loading state management
  - Authentication UI container

### 1.3 Data Services Layer
- **Purpose**: Abstracts data operations from UI components
- **Implementation**: `services/` directory
- **Key Services**:
  - `auth-service.js`: Authentication operations
  - `data-service.js`: Generic data operations
  - `sync-service.js`: Offline/online synchronization
  - `notification-service.js`: Push notification management

## 2. Feature Modules

Each feature module follows a consistent pattern:
- Model: Data structure and validation
- Service: Business logic and data operations
- View: UI components and event handlers

### 2.1 Plants Module
- **Purpose**: Plant information management
- **Implementation**: `modules/plants/`
- **Components**:
  - `plant-model.js`: Plant data structure
  - `plant-service.js`: Plant data operations
  - `plant-list.js`: Plant selection UI
  - `plant-detail.js`: Plant information display

### 2.2 Garden Plot Module
- **Purpose**: Garden layout management
- **Implementation**: `modules/plot/`
- **Components**:
  - `plot-model.js`: Plot and cell data structures
  - `plot-service.js`: Plot operations and persistence
  - `plot-grid.js`: Interactive garden grid UI
  - `planting-service.js`: Plant placement logic

### 2.3 Tasks Module
- **Purpose**: Garden task management
- **Implementation**: `modules/tasks/`
- **Components**:
  - `task-model.js`: Task data structure
  - `task-service.js`: Task CRUD operations
  - `task-list.js`: Task display and interaction
  - `task-scheduler.js`: Recurring task management

## 3. Data Models

### 3.1 User
```
{
  id: string,
  displayName: string,
  email: string,
  settings: {
    notifications: boolean,
    theme: 'light' | 'dark' | 'system',
    units: 'imperial' | 'metric'
  },
  lastSyncTimestamp: number
}
```

### 3.2 Plant
```
{
  id: string,
  name: string,
  scientificName: string,
  emoji: string,
  growingInfo: {
    daysToMaturity: number,
    spacingInInches: number,
    sunRequirements: string,
    waterRequirements: string,
    soilRequirements: string,
    plantingDepth: string,
    companionPlants: string[],
    avoidPlanting: string[]
  },
  careInstructions: string,
  taskTemplates: TaskTemplate[]
}
```

### 3.3 TaskTemplate
```
{
  title: string,
  description: string,
  timingType: 'daysAfterPlanting' | 'recurring',
  timing: number,
  category: string
}
```

### 3.4 Plot
```
{
  id: string,
  name: string,
  width: number,
  height: number,
  createdAt: number,
  lastModified: number
}
```

### 3.5 Cell
```
{
  id: string,
  x: number,
  y: number,
  plotId: string,
  plantId: string | null,
  plantedDate: number | null,
  status: 'empty' | 'planted' | 'harvested'
}
```

### 3.6 Task
```
{
  id: string,
  title: string,
  description: string,
  dueDate: number,
  completed: boolean,
  completedAt: number | null,
  priority: 'low' | 'medium' | 'high',
  category: string,
  relatedPlantingId: string | null,
  createdAt: number,
  recurring: boolean,
  recurrencePattern: string | null,
  syncStatus: 'synced' | 'pending' | 'conflict'
}
```

## 4. Offline-First Strategy

### 4.1 Data Storage Hierarchy
```
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
| IndexedDB      |---->| Sync Service   |---->| Firestore      |
| (Local Storage)|     | (Background)   |     | (Cloud Storage)|
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
```

1. All data operations write to IndexedDB first
2. UI reads from IndexedDB for immediate feedback
3. Sync service handles data synchronization with Firestore
4. Conflict resolution strategy prioritizes user's latest changes

### 4.2 Service Worker Caching Strategy
- **App Shell**: Cache-first strategy
- **Static Assets**: Cache-first with network fallback
- **API Requests**: Network-first with cached fallback
- **Dynamic Content**: Stale-while-revalidate

## 5. Push Notification Architecture

```
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
| Firebase Cloud |---->| Service Worker |---->| Notification   |
| Messaging      |     | (Push Event)   |     | UI             |
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
```

1. Task-based notifications triggered by due dates
2. Notification permission requested at appropriate user journey point
3. Notification actions allow task completion without opening app
4. Offline support for scheduled notifications

## 6. Performance Optimization

### 6.1 Code Splitting
- Core app shell loaded first
- Feature modules loaded on demand
- Critical CSS inlined in head
- Non-critical CSS loaded asynchronously

### 6.2 Asset Optimization
- SVG icons for crisp display at all resolutions
- Responsive images with srcset
- Font loading optimization
- Preloading of critical resources

### 6.3 Rendering Strategy
- Server-side or pre-rendered initial content
- Progressive enhancement for interactivity
- Skeleton screens during loading
- Optimistic UI updates

## 7. Implementation Roadmap

### Phase 1: Core Infrastructure
1. Set up modular project structure
2. Implement app shell and routing
3. Create data services layer
4. Configure service worker with basic caching

### Phase 2: Offline-First Foundation
1. Implement IndexedDB storage
2. Create sync service
3. Add offline indicators and functionality
4. Test offline-to-online transitions

### Phase 3: Feature Modules
1. Refactor plants module
2. Refactor plot module
3. Refactor tasks module
4. Implement cross-module communication

### Phase 4: Progressive Enhancements
1. Add push notification support
2. Implement background sync
3. Add installability improvements
4. Performance optimization
