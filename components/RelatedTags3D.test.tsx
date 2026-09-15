import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuditHistoryItem } from '../types';

// Mock Three.js / R3F Canvas components for happy-dom test environment BEFORE importing component
mock.module('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: () => {},
  useThree: () => ({
    camera: { position: { x: 0, y: 0, z: 35 } }
  })
}));

mock.module('@react-three/drei', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span data-testid="3d-text">{children}</span>,
  Billboard: ({ children }: { children: React.ReactNode }) => <div data-testid="3d-billboard">{children}</div>,
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stars: () => <div data-testid="stars" />
}));

// Import RelatedTags3D after mocks
import RelatedTags3D from './RelatedTags3D';

const LocationTracker = () => {
  const loc = useLocation();
  return <div data-testid="loc-tracker">{loc.pathname + loc.search}</div>;
};

const mockHistory: AuditHistoryItem[] = [
  {
    boeId: 'BOE-A-2024-1001',
    title: 'Nombramiento Director General',
    timestamp: 1700000000000,
    audit: {
      nivel_transparencia: 30,
      analisis_critico: 'Falta de publicidad en el proceso',
      resumen_ciudadano: 'Nombramiento discrecional',
      resumen_tweet: 'Tweet resumen',
      banderas_rojas: ['Libre designación', 'Falta de publicidad'],
      tipologia: 'Nombramientos',
      comunidad_autonoma: 'Comunidad de Madrid'
    }
  },
  {
    boeId: 'BOE-A-2024-1002',
    title: 'Adjudicación Contrato de Emergencia',
    timestamp: 1700001000000,
    audit: {
      nivel_transparencia: 25,
      analisis_critico: 'Contrato sin concurrencia',
      resumen_ciudadano: 'Contratación directa',
      resumen_tweet: 'Tweet resumen 2',
      banderas_rojas: ['Libre designación', 'Contratación de emergencia'],
      tipologia: 'Contratación pública',
      comunidad_autonoma: 'Comunidad de Madrid'
    }
  },
  {
    boeId: 'BOE-A-2024-1003',
    title: 'Resolución de Subvenciones',
    timestamp: 1700002000000,
    audit: {
      nivel_transparencia: 85,
      analisis_critico: 'Procedimiento transparente y detallado',
      resumen_ciudadano: 'Subvenciones asignadas por baremo público',
      resumen_tweet: 'Tweet resumen 3',
      banderas_rojas: [],
      tipologia: 'Subvenciones',
      comunidad_autonoma: 'Andalucía'
    }
  }
];

describe('RelatedTags3D Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state when history is empty', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={[]} lang="es" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Red de Conceptos/i)).toBeTruthy();
    expect(screen.getByText(/No hay suficientes datos de relaciones/i)).toBeTruthy();
  });

  it('renders 3D Canvas and controls when history is provided', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Red de Conceptos/i)).toBeTruthy();
    expect(screen.getByTestId('r3f-canvas')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Buscar concepto/i)).toBeTruthy();
  });

  it('switches between 3D mode and 2D Analytical view', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    // Switch to 2D view
    const view2dBtn = screen.getByText(/Relaciones y Hubs/i);
    fireEvent.click(view2dBtn);

    // Should display Hubs and Strongest Relations
    expect(screen.getByText(/Conceptos Clave \(Hubs\)/i)).toBeTruthy();
    expect(screen.getByText(/Relaciones Más Fuertes/i)).toBeTruthy();

    // Switch back to 3D view
    const view3dBtn = screen.getByText(/Grafo 3D/i);
    fireEvent.click(view3dBtn);
    expect(screen.getByTestId('r3f-canvas')).toBeTruthy();
  });

  it('filters by category buttons', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    // Click on "Banderas Rojas" filter
    const flagsFilterBtn = screen.getByRole('button', { name: /Banderas Rojas/i });
    fireEvent.click(flagsFilterBtn);

    // Filter by "Comunidades"
    const regionFilterBtn = screen.getByRole('button', { name: /Comunidades/i });
    fireEvent.click(regionFilterBtn);

    // Filter back to "Todos"
    const allFilterBtn = screen.getByRole('button', { name: /Todos/i });
    fireEvent.click(allFilterBtn);
  });

  it('filters by search input', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar concepto/i);
    fireEvent.change(searchInput, { target: { value: 'Madrid' } });
    expect((searchInput as HTMLInputElement).value).toBe('Madrid');

    // Clear search
    const clearBtn = screen.getByTitle(/Cerrar/i);
    fireEvent.click(clearBtn);
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('toggles auto-rotate and fullscreen mode', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    const autoRotateBtn = screen.getByTitle(/Auto-rotación/i);
    fireEvent.click(autoRotateBtn);

    const fullscreenBtn = screen.getByTitle(/Pantalla completa/i);
    fireEvent.click(fullscreenBtn);
    fireEvent.click(fullscreenBtn);
  });

  it('interacts with hub item in 2D view to open inspector and navigate to history', () => {
    render(
      <MemoryRouter initialEntries={['/related-tags']}>
        <LocationTracker />
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    // Switch to 2D
    const view2dBtn = screen.getByText(/Relaciones y Hubs/i);
    fireEvent.click(view2dBtn);

    // Click on Madrid or Libre designación hub card to inspect
    const tagElements = screen.getAllByText(/Comunidad de Madrid|Libre designación/i);
    expect(tagElements.length).toBeGreaterThan(0);
    fireEvent.click(tagElements[0]);

    // Inspector should open with "Explorar en Historial" button
    const historyBtn = screen.getByRole('button', { name: /Explorar en Historial/i });
    expect(historyBtn).toBeTruthy();
    fireEvent.click(historyBtn);

    const locTracker = screen.getByTestId('loc-tracker');
    expect(locTracker.textContent).toContain('/history?tags=');
  });

  it('renders correctly in English language', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="en" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Concept Network/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search concept/i)).toBeTruthy();
    expect(screen.getByText(/3D Graph/i)).toBeTruthy();
    expect(screen.getByText(/Relationships & Hubs/i)).toBeTruthy();
  });

  it('renders loading state when isHistoryLoaded is false', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={[]} lang="es" isHistoryLoaded={false} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cargando red de conceptos/i)).toBeTruthy();
  });

  it('shows no concepts overlay and resets filters when search has no matches', () => {
    render(
      <MemoryRouter>
        <RelatedTags3D history={mockHistory} lang="es" />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar concepto/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentConceptXYZ' } });

    expect(screen.getByText(/No se encontraron conceptos/i)).toBeTruthy();
    const resetBtn = screen.getByRole('button', { name: /Restablecer filtros/i });
    expect(resetBtn).toBeTruthy();

    fireEvent.click(resetBtn);
    expect((searchInput as HTMLInputElement).value).toBe('');
  });
});
