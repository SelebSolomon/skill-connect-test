import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gavel } from 'lucide-react';
import { bidsApi } from '../../api/bids.api';
import { BidCard } from '../../components/shared/BidCard';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useState } from 'react';
import { getErrorMessage } from '../../hooks/useErrorMessage';

export function MyBidsPage() {
  const queryClient = useQueryClient();
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: bids, isLoading } = useQuery({
    queryKey: ['my-bids'],
    queryFn: bidsApi.getMyBids,
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => bidsApi.withdrawBid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bids'] });
      setWithdrawId(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <Spinner fullPage />;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Bids</h1>
        <p className="text-gray-500 mt-1">{bids?.length ?? 0} bids submitted</p>
      </div>

      {(bids ?? []).length === 0 ? (
        <div className="text-center py-20">
          <Gavel className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No bids yet</h3>
          <p className="text-gray-500 mt-1">Browse open jobs and submit your first bid</p>
          <Button className="mt-4" onClick={() => window.location.href = '/jobs'}>
            Browse Jobs
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {(bids ?? []).map((bid) => (
            <div key={bid._id} className="relative">
              <BidCard bid={bid} />
              {bid.status === 'pending' && (
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setWithdrawId(bid._id)}
                  >
                    Withdraw Bid
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!withdrawId} onClose={() => setWithdrawId(null)} title="Withdraw Bid" size="sm">
        <p className="text-gray-600 mb-6">Are you sure you want to withdraw this bid?</p>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setWithdrawId(null)}>Cancel</Button>
          <Button
            variant="danger"
            fullWidth
            loading={withdrawMutation.isPending}
            onClick={() => withdrawId && withdrawMutation.mutate(withdrawId)}
          >
            Withdraw
          </Button>
        </div>
      </Modal>
    </div>
  );
}
