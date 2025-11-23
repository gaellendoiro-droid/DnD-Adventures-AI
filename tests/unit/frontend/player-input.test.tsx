import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerInput } from '@/components/game/player-input';

// Mock useToast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock DiceRoller component
vi.mock('@/components/game/dice-roller', () => ({
  DiceRoller: ({ onRoll, onPopoverOpenChange }: any) => (
    <button
      onClick={() => {
        onRoll({ result: 20, sides: 20 });
        onPopoverOpenChange(false);
      }}
      data-testid="dice-roller"
    >
      Dice Roller
    </button>
  ),
}));

describe('PlayerInput Component - Issue #76', () => {
  const mockOnSendMessage = vi.fn();
  const mockOnDiceRoll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input deshabilitado cuando DM está pensando', () => {
    it('should disable textarea when isDMThinking is true and disabled is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={true}
          disabled={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should disable textarea when disabled prop is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          disabled={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should disable send button when isDMThinking is true and disabled is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={true}
          disabled={true}
        />
      );

      const sendButton = screen.getByRole('button', { name: /enviar acción/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when disabled prop is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          disabled={true}
        />
      );

      const sendButton = screen.getByRole('button', { name: /enviar acción/i });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Placeholder cuando DM está pensando', () => {
    it('should show "El DM está pensando..." placeholder when isDMThinking is true and disabled is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={true}
          disabled={true}
        />
      );

      const textarea = screen.getByPlaceholderText('El DM está pensando...');
      expect(textarea).toBeInTheDocument();
    });

    it('should show "El DM está pensando..." placeholder when disabled and isDMThinking is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          disabled={true}
          isDMThinking={true}
        />
      );

      const textarea = screen.getByPlaceholderText('El DM está pensando...');
      expect(textarea).toBeInTheDocument();
    });

    it('should show normal placeholder when isDMThinking is false and not disabled', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={false}
        />
      );

      const textarea = screen.getByPlaceholderText('¿Qué quieres hacer?');
      expect(textarea).toBeInTheDocument();
    });

    it('should show player turn placeholder when isPlayerTurn is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isPlayerTurn={true}
          isDMThinking={false}
        />
      );

      const textarea = screen.getByPlaceholderText('Es tu turno! ¿Qué quieres hacer?');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Comportamiento cuando input está habilitado', () => {
    it('should allow typing when not disabled and DM is not thinking', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toBeDisabled();

      fireEvent.change(textarea, { target: { value: 'Ataco al goblin' } });
      expect(textarea).toHaveValue('Ataco al goblin');
    });

    it('should call onSendMessage when form is submitted with valid input', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar acción/i });

      fireEvent.change(textarea, { target: { value: 'Ataco al goblin' } });
      fireEvent.click(sendButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith('Ataco al goblin');
      expect(textarea).toHaveValue(''); // Input should be cleared after sending
    });

    it('should not call onSendMessage when disabled', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          disabled={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /enviar acción/i });

      // Even if we could type (which we can't), clicking send shouldn't work
      fireEvent.click(sendButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should not call onSendMessage when isDMThinking is true and disabled is true', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={true}
          disabled={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      const form = textarea.closest('form');

      // Try to submit form (even though textarea is disabled)
      if (form) {
        fireEvent.submit(form);
      }

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Prevención de envío cuando DM está pensando', () => {
    it('should prevent Enter key from submitting when disabled', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={true}
          disabled={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Even if we could type (which we can't), Enter shouldn't submit
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should allow Enter key to submit when enabled', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: 'Ataco al goblin' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(mockOnSendMessage).toHaveBeenCalledWith('Ataco al goblin');
    });

    it('should not submit on Enter+Shift (new line)', () => {
      render(
        <PlayerInput
          onSendMessage={mockOnSendMessage}
          onDiceRoll={mockOnDiceRoll}
          isDMThinking={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: 'Ataco al goblin' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });
});

