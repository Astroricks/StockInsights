import { Button } from '@/components/ui/button';

const StockButton = ({ ticker, onSearch, disabled }) => {
  const handleClick = () => {
    onSearch(ticker);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled}
    >
      {ticker}
    </Button>
  );
};

export default StockButton; 