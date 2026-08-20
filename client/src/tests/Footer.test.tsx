import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../components/Footer';

describe('<Footer />', () => {
  it('shows the app name, version, commit, and a signature with the current year', () => {
    render(<Footer />);

    expect(screen.getByText(/TradeFlow Lite/)).toBeInTheDocument();
    expect(screen.getByText('vtest (testsha)')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`©\\s*${new Date().getFullYear()}`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rabin avidan/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/rabin-avidan-1aab6653/',
    );
  });
});
