<?php

namespace App\Enums;

/**
 * Статуси заявки на ремонт та дозволені переходи між ними.
 */
enum OrderStatus: string
{
    case New = 'new';
    case Diagnostics = 'diagnostics';
    case InRepair = 'in_repair';
    case WaitingParts = 'waiting_parts';
    case Ready = 'ready';
    case Issued = 'issued';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Нова',
            self::Diagnostics => 'Діагностика',
            self::InRepair => 'В ремонті',
            self::WaitingParts => 'Очікує запчастини',
            self::Ready => 'Готова до видачі',
            self::Issued => 'Видана',
            self::Cancelled => 'Скасована',
        };
    }

    /** Статуси, в які можна перейти з поточного. */
    public function allowedNext(): array
    {
        return match ($this) {
            self::New => [self::Diagnostics, self::Cancelled],
            self::Diagnostics => [self::InRepair, self::WaitingParts, self::Ready, self::Cancelled],
            self::InRepair => [self::WaitingParts, self::Ready, self::Cancelled],
            self::WaitingParts => [self::InRepair, self::Cancelled],
            self::Ready => [self::Issued, self::InRepair],
            self::Issued, self::Cancelled => [],
        };
    }

    /** Заявка закрита — змінювати її вже не можна. */
    public function isFinal(): bool
    {
        return $this === self::Issued || $this === self::Cancelled;
    }

    /** Для випадаючих списків на фронтенді. */
    public function toOption(): array
    {
        return ['value' => $this->value, 'label' => $this->label()];
    }
}
