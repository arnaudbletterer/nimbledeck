# References

The sources behind the claims of `science.md`. Each one was checked on 2026-10-11 against Crossref (title, authors, year,
journal, volume, pages, DOI) and, where noted, PubMed or a later paper that reports it. A reference that could not be checked
was left out. The slides cite them by author and year in a small line under the picture, and the speaker notes name the key in
square brackets. `packages/cli/test/science-refs.test.mjs` fails when a key in the notes is missing here, or an entry here is
never cited.

Format of an entry: `- [key] authors (year). Title. Venue. DOI. Claim: what the deck uses it for. Checked: how.`

- [bayes1763] Bayes, T. and Price, R. (1763). An essay towards solving a problem in the doctrine of chances. *Philosophical Transactions of the Royal Society of London* 53, 370-418. https://doi.org/10.1098/rstl.1763.0053. Claim: the rule of the "for the curious" slide; Bayes died before it was published and Price communicated it. Checked: Crossref (title, year, pages, DOI); the Royal Society page redirected from the DOI.
- [kahneman1973] Kahneman, D. and Tversky, A. (1973). On the psychology of prediction. *Psychological Review* 80(4), 237-251. https://doi.org/10.1037/h0034747. Claim: people tend to ignore how common something is (the base rate) when they judge a case. Checked: Crossref.
- [casscells1978] Casscells, W., Schoenberger, A. and Graboys, T. B. (1978). Interpretation by physicians of clinical laboratory results. *New England Journal of Medicine* 299(18), 999-1001. https://doi.org/10.1056/NEJM197811022991808. Claim: of 60 students, house officers and physicians at Harvard teaching hospitals, 11 gave the right answer (about 2 percent) to a question on a condition with prevalence 1 in 1,000 and a test with a 5 percent false positive rate; the most common answer, from 27 of 60, was 95 percent. Checked: Crossref and PubMed (PMID 692627) for the citation; the counts (11 of 60, 27 of 60, the three groups of 20) are as reported by Manrai et al. (2014) and in a PubMed Central article on the same study, because the 1978 article itself is not open. The deck quotes only those counts.
- [manrai2014] Manrai, A. K., Bhatia, G., Strymish, J., Kohane, I. S. and Jain, S. H. (2014). Medicine's uncomfortable relationship with math: calculating positive predictive value. *JAMA Internal Medicine* 174(6), 991. https://doi.org/10.1001/jamainternmed.2014.1059. Claim: a repeat of the Casscells question found much the same (14 of 61 correct, against 11 of 60). Checked: Crossref for the citation; the 14 of 61 figure comes from a secondary description (a PubMed Central article citing it), not from the paper itself.
- [eddy1982] Eddy, D. M. (1982). Probabilistic reasoning in clinical medicine: problems and opportunities. In Kahneman, D., Slovic, P. and Tversky, A. (eds), *Judgment under Uncertainty: Heuristics and Biases*, Cambridge University Press, 249-267. https://doi.org/10.1017/CBO9780511809477.019. Claim: physicians make errors of this kind when they read a mammogram. Checked: Crossref and the Cambridge catalogue (author, chapter 18, pages, abstract).
- [gigerenzer1995] Gigerenzer, G. and Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction: frequency formats. *Psychological Review* 102(4), 684-704. https://doi.org/10.1037/0033-295X.102.4.684. Claim: stating a problem as counts of people ("10 out of 10,000") makes it easier to reason about than stating it as percentages. Checked: Crossref; abstract seen through the university repository record.
- [hoffrage1998] Hoffrage, U. and Gigerenzer, G. (1998). Using natural frequencies to improve diagnostic inferences. *Academic Medicine* 73(5), 538-540. https://doi.org/10.1097/00001888-199805000-00024. Claim: 48 physicians in Munich and Duesseldorf gave a correct answer in about 10 percent of the problems stated as probabilities and about 46 percent when stated as natural frequencies. Checked: PubMed (PMID 9609869), abstract.
- [gigerenzer2007] Gigerenzer, G., Gaissmaier, W., Kurz-Milcke, E., Schwartz, L. M. and Woloshin, S. (2007). Helping doctors and patients make sense of health statistics. *Psychological Science in the Public Interest* 8(2), 53-96. https://doi.org/10.1111/j.1539-6053.2008.00033.x. Claim: asking for counts of people helps doctors and patients read health statistics. Checked: Crossref and PubMed (PMID 26161749), abstract.

## Tools and data

- The people, the condition and the numbers are simulated. Sam is made up and no real disease is meant. An illustration, not medical advice.
- Nimbledeck on Slidev and Vue; equations typeset by KaTeX with fonts that ship with the deck. See `THIRD_PARTY.md` at the repository root.
- No music, photograph or other third-party asset is used, and no Python runs.
