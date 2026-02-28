import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request, { params }) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  const supabase = createServiceClient();

  const { data: security, error } = await supabase
    .from('securities')
    .select('*')
    .ilike('symbol', symbol)
    .single();

  if (error || !security) {
    return NextResponse.json({ error: 'Security not found' }, { status: 404 });
  }

  let etfDetails = null;
  if (security.type === 'etf' || security.type === 'fund') {
    const { data } = await supabase
      .from('etf_details')
      .select('*')
      .eq('security_id', security.id)
      .single();
    etfDetails = data;
  }

  return NextResponse.json({
    data: {
      ...security,
      etf_details: etfDetails,
    },
  });
}
