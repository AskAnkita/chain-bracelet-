(() => {
  if (window.customElements.get('delivery-estimate')) return;

  class DeliveryEstimate extends HTMLElement {
    connectedCallback() {
      const output = this.querySelector('[data-delivery-range]');
      if (!output) return;

      const today = new Date();
      const earliest = this.addDays(today, Number(this.dataset.minDays) || 7);
      const latest = this.addDays(today, Number(this.dataset.maxDays) || 16);
      const sameYear = earliest.getFullYear() === latest.getFullYear();
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        ...(!sameYear && { year: 'numeric' })
      });

      output.textContent = `${formatter.format(earliest)}–${formatter.format(latest)}`;
    }

    addDays(date, days) {
      const result = new Date(date);
      result.setHours(12, 0, 0, 0);
      result.setDate(result.getDate() + days);
      return result;
    }
  }

  window.customElements.define('delivery-estimate', DeliveryEstimate);
})();
