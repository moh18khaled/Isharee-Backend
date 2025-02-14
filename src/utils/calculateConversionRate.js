const calculateConversionRate = (post) => {
    const totalIntents = post.purchaseIntent.length;
    const interestedUsers = post.purchaseIntent.filter((p) => p.intent === "yes").length;
  
    const conversionRate = totalIntents > 0 ? ((interestedUsers / totalIntents) * 100).toFixed(2) : 0;
    return { totalIntents, interestedUsers, conversionRate };
  };
  